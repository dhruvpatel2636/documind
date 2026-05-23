import pdfParse from "pdf-parse";
import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../lib/prisma";
import { generateEmbedding } from "../lib/openai";
import { uploadToCloudinary } from "../lib/cloudinary";
import { chunkText, chunkTextByPages } from "../lib/chunker";
import { ProcessDocumentJob } from "../types";
import logger from "../lib/logger";

export async function processDocument(job: ProcessDocumentJob): Promise<void> {
  const { documentId, type, fileBuffer, sourceUrl } = job;

  try {
    logger.info(`Processing document ${documentId}`, { type });

    let chunks: {
      content: string;
      chunkIndex: number;
      pageNumber?: number;
      tokenCount: number;
    }[] = [];

    if (type === "PDF" && fileBuffer) {
      const pdfData = await pdfParse(fileBuffer);
      // Try to extract per-page text for better attribution
      const pageTexts = pdfData.text
        .split(/\f/)
        .map((text, i) => ({
          text: text.trim(),
          pageNumber: i + 1,
        }))
        .filter((p) => p.text.length > 0);

      if (pageTexts.length > 1) {
        chunks = chunkTextByPages(pageTexts);
      } else {
        chunks = chunkText(pdfData.text);
      }

      // Update page count
      await prisma.document.update({
        where: { id: documentId },
        data: { pageCount: pdfData.numpages },
      });
    } else if (type === "URL" && sourceUrl) {
      const html = await scrapeUrl(sourceUrl);
      chunks = chunkText(html);
    } else if (type === "TEXT" && fileBuffer) {
      const text = fileBuffer.toString("utf-8");
      chunks = chunkText(text);
    } else {
      throw new Error("Invalid document job configuration");
    }

    logger.info(`Generated ${chunks.length} chunks for document ${documentId}`);

    // Process chunks in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (chunk) => {
          const embedding = await generateEmbedding(chunk.content);
          const vectorLiteral = `[${embedding.join(",")}]`;

          await prisma.$executeRaw`
            INSERT INTO document_chunks (id, "documentId", content, embedding, "chunkIndex", "pageNumber", "tokenCount", "createdAt")
            VALUES (
              gen_random_uuid(),
              ${documentId}::text,
              ${chunk.content},
              ${vectorLiteral}::vector,
              ${chunk.chunkIndex},
              ${chunk.pageNumber ?? null},
              ${chunk.tokenCount},
              NOW()
            )
          `;
        }),
      );
      logger.info(
        `Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`,
      );
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });

    logger.info(`Document ${documentId} processing complete`);
  } catch (error) {
    logger.error(`Document processing failed for ${documentId}`, { error });
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

async function scrapeUrl(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RAGBot/1.0)" },
  });
  const $ = cheerio.load(response.data);
  // Remove scripts, styles, nav, footer
  $("script, style, nav, footer, header, aside, .ad, #ad").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text;
}

export async function uploadDocumentFile(
  buffer: Buffer,
  filename: string,
): Promise<{ url: string; publicId: string }> {
  return uploadToCloudinary(buffer, filename);
}

export async function getUserDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fileUrl: true,
      sourceUrl: true,
      type: true,
      status: true,
      pageCount: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });
}

export async function deleteDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });
  if (!doc) throw new Error("Document not found");
  await prisma.document.delete({ where: { id: documentId } });
}
