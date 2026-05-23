import { prisma } from "../lib/prisma";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { openrouter, generateEmbedding, CHAT_MODEL } from "../lib/openai";
import { ChunkWithScore, ChatSource } from "../types";
import logger from "../lib/logger";

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.3;

type RawChunkResult = {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
  docId: string;
  docName: string;
  docType: string;
};

export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  documentIds?: string[],
): Promise<ChunkWithScore[]> {
  const embedding = await generateEmbedding(query);
  const vectorLiteral = `[${embedding.join(",")}]`;

  let rawResults: RawChunkResult[];

  if (documentIds && documentIds.length > 0) {
    rawResults = (await prisma.$queryRawUnsafe(
      `
      SELECT
        dc.id,
        dc."documentId",
        dc.content,
        dc."chunkIndex",
        dc."pageNumber",
        1 - (dc.embedding <=> $1::vector) AS similarity,
        d.id AS "docId",
        d.name AS "docName",
        d.type AS "docType"
      FROM document_chunks dc
      JOIN documents d ON d.id = dc."documentId"
      WHERE d."userId" = $2
        AND d.status = 'READY'
        AND d.id = ANY($4::text[])
        AND 1 - (dc.embedding <=> $1::vector) > ${SIMILARITY_THRESHOLD}
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $3
      `,
      vectorLiteral,
      userId,
      TOP_K,
      documentIds,
    )) as RawChunkResult[];
  } else {
    rawResults = (await prisma.$queryRawUnsafe(
      `
      SELECT
        dc.id,
        dc."documentId",
        dc.content,
        dc."chunkIndex",
        dc."pageNumber",
        1 - (dc.embedding <=> $1::vector) AS similarity,
        d.id AS "docId",
        d.name AS "docName",
        d.type AS "docType"
      FROM document_chunks dc
      JOIN documents d ON d.id = dc."documentId"
      WHERE d."userId" = $2
        AND d.status = 'READY'
        AND 1 - (dc.embedding <=> $1::vector) > ${SIMILARITY_THRESHOLD}
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $3
      `,
      vectorLiteral,
      userId,
      TOP_K,
    )) as RawChunkResult[];
  }

  return rawResults.map((r: RawChunkResult) => ({
    id: r.id,
    documentId: r.documentId,
    content: r.content,
    chunkIndex: r.chunkIndex,
    pageNumber: r.pageNumber,
    similarity: Number(r.similarity),
    document: { id: r.docId, name: r.docName, type: r.docType },
  }));
}

function buildMessages(
  question: string,
  chunks: ChunkWithScore[],
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
): ChatCompletionMessageParam[] {
  const context = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: ${c.document.name}${c.pageNumber ? ` (Page ${c.pageNumber})` : ""}]\n${c.content}`,
    )
    .join("\n\n---\n\n");

  return [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-6),
    {
      role: "user",
      content:
        chunks.length > 0
          ? `Context:\n${context}\n\nQuestion: ${question}`
          : `Question: ${question}\n\nNote: No relevant documents found. Please inform the user.`,
    },
  ];
}

function buildSystemPrompt(settings?: {
  chatbotName?: string;
  systemPrompt?: string;
  tone?: string;
}): string {
  if (settings?.systemPrompt) {
    return `${settings.systemPrompt}\n\nIMPORTANT: Answer ONLY from the provided context.`;
  }
  return `You are ${settings?.chatbotName || "an AI assistant"}. 
Answer questions ONLY based on the provided context below. 
If the answer is not found in the context, say "I don't have enough information in the uploaded documents to answer that."
Be ${settings?.tone || "professional"} and concise.
Always cite the source document when referencing information.`;
}

export async function generateRAGResponse(
  question: string,
  chunks: ChunkWithScore[],
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  settings?: { chatbotName?: string; systemPrompt?: string; tone?: string },
): Promise<{ content: string; sources: ChatSource[] }> {
  const messages = buildMessages(
    question,
    chunks,
    chatHistory,
    buildSystemPrompt(settings),
  );

  const response = await openrouter.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1500,
  });

  const content =
    response.choices[0]?.message?.content || "I could not generate a response.";

  const sources: ChatSource[] = chunks.map((c) => ({
    documentId: c.documentId,
    documentName: c.document.name,
    chunkId: c.id,
    pageNumber: c.pageNumber,
    content:
      c.content.substring(0, 200) + (c.content.length > 200 ? "..." : ""),
    similarity: Math.round(c.similarity * 100) / 100,
  }));

  logger.info("RAG response generated", {
    chunksUsed: chunks.length,
    tokensUsed: response.usage?.total_tokens,
  });

  return { content, sources };
}

export async function* generateRAGResponseStream(
  question: string,
  chunks: ChunkWithScore[],
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  settings?: { chatbotName?: string; systemPrompt?: string; tone?: string },
): AsyncGenerator<string> {
  const messages = buildMessages(
    question,
    chunks,
    chatHistory,
    buildSystemPrompt(settings),
  );

  const stream = await openrouter.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1500,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
