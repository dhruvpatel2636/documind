import pdfParse from "pdf-parse";
import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../../infrastructure/database/prisma";
import { generateEmbedding } from "../../infrastructure/ai/openai";
import { logger } from "../../infrastructure/logger";
import { chunkText, chunkTextByPages } from "../../shared/utils/chunker";
import type { TextChunk } from "../../shared/utils/chunker";
import { insertChunk } from "../rag";
import type { ProcessDocumentJob } from "./document.schema";

const EMBEDDING_BATCH_SIZE = 10;

/**
 * Background pipeline: extract text → chunk → embed → persist.
 * Updates the document's status to READY on success or FAILED on error.
 */
export async function processDocument(job: ProcessDocumentJob): Promise<void> {
  const { documentId, type, fileBuffer, sourceUrl } = job;

  try {
    logger.info(`Processing document ${documentId}`, { type });

    const chunks = await extractChunks(job);
    logger.info(`Generated ${chunks.length} chunks for document ${documentId}`);

    await embedAndStoreChunks(documentId, chunks);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });

    logger.info(`Document ${documentId} processing complete`);
  } catch (error) {
    logger.error(`Document processing failed for ${documentId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });
    throw error;
  }

  void fileBuffer;
  void sourceUrl;
}

async function extractChunks(job: ProcessDocumentJob): Promise<TextChunk[]> {
  const { documentId, type, fileBuffer, sourceUrl } = job;

  if (type === "PDF" && fileBuffer) {
    // Capture text per page so chunks keep accurate page attribution.
    // pdf-parse invokes pagerender sequentially for pages 1..N, so collecting
    // in call order is safe and far more reliable than splitting on form-feeds
    // (which pdf-parse does not emit).
    const pageTexts: { text: string; pageNumber: number }[] = [];

    const pdfData = await pdfParse(fileBuffer, {
      pagerender: (pageData) => renderPage(pageData, pageTexts),
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { pageCount: pdfData.numpages },
    });

    const nonEmptyPages = pageTexts.filter((p) => p.text.length > 0);

    return nonEmptyPages.length > 1
      ? chunkTextByPages(nonEmptyPages)
      : chunkText(pdfData.text);
  }

  if (type === "URL" && sourceUrl) {
    const html = await scrapeUrl(sourceUrl);
    return chunkText(html);
  }

  if (type === "TEXT" && fileBuffer) {
    return chunkText(fileBuffer.toString("utf-8"));
  }

  throw new Error("Invalid document job configuration");
}

async function embedAndStoreChunks(
  documentId: string,
  chunks: TextChunk[],
): Promise<void> {
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    await Promise.all(
      batch.map(async (chunk) => {
        const embedding = await generateEmbedding(chunk.content);
        await insertChunk({
          documentId,
          content: chunk.content,
          embedding,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber ?? null,
          tokenCount: chunk.tokenCount,
        });
      }),
    );
    logger.info(
      `Processed batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}/${Math.ceil(chunks.length / EMBEDDING_BATCH_SIZE)}`,
    );
  }
}

/**
 * Extract text from a single PDF page (mirrors pdf-parse's default renderer)
 * while recording the per-page text + 1-based page number for attribution.
 */
async function renderPage(
  // pdf-parse exposes the raw PDF.js page proxy; it is untyped.
  pageData: {
    pageNumber: number;
    getTextContent: (opts: {
      normalizeWhitespace: boolean;
      disableCombineTextItems: boolean;
    }) => Promise<{ items: Array<{ str: string; transform: number[] }> }>;
  },
  collected: { text: string; pageNumber: number }[],
): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  let lastY: number | undefined;
  let text = "";
  for (const item of textContent.items) {
    const y = item.transform[5];
    if (lastY === y || lastY === undefined) text += item.str;
    else text += "\n" + item.str;
    lastY = y;
  }

  collected.push({ text: text.trim(), pageNumber: pageData.pageNumber });
  return text;
}

async function scrapeUrl(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RAGBot/1.0)" },
  });
  const $ = cheerio.load(response.data);
  $("script, style, nav, footer, header, aside, .ad, #ad").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}
