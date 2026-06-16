import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  openrouter,
  CHAT_MODEL,
  generateEmbedding,
} from "../../infrastructure/ai/openai";
import { logger } from "../../infrastructure/logger";
import {
  searchChunks,
  type ChunkWithScore,
} from "./rag.repository";

export type { ChunkWithScore } from "./rag.repository";

export interface ChatSource {
  documentId: string;
  documentName: string;
  chunkId: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
}

export interface ChatbotSettingsInput {
  chatbotName?: string;
  systemPrompt?: string;
  tone?: string;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Embed the query and retrieve the most relevant chunks for the user.
 */
export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  documentIds?: string[],
): Promise<ChunkWithScore[]> {
  const embedding = await generateEmbedding(query);
  return searchChunks(embedding, userId, documentIds);
}

export function chunksToSources(chunks: ChunkWithScore[]): ChatSource[] {
  return chunks.map((c) => ({
    documentId: c.documentId,
    documentName: c.document.name,
    chunkId: c.id,
    pageNumber: c.pageNumber,
    content:
      c.content.substring(0, 200) + (c.content.length > 200 ? "..." : ""),
    similarity: Math.round(c.similarity * 100) / 100,
  }));
}

function buildSystemPrompt(settings?: ChatbotSettingsInput): string {
  if (settings?.systemPrompt) {
    return `${settings.systemPrompt}\n\nIMPORTANT: Answer ONLY from the provided context.`;
  }
  return `You are ${settings?.chatbotName || "an AI assistant"}.
Answer questions ONLY based on the provided context below.
If the answer is not found in the context, say "I don't have enough information in the uploaded documents to answer that."
Be ${settings?.tone || "professional"} and concise.
Always cite the source document when referencing information.`;
}

function buildMessages(
  question: string,
  chunks: ChunkWithScore[],
  chatHistory: HistoryMessage[],
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

/**
 * One-shot RAG completion.
 */
export async function generateRAGResponse(
  question: string,
  chunks: ChunkWithScore[],
  chatHistory: HistoryMessage[],
  settings?: ChatbotSettingsInput,
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

  logger.info("RAG response generated", {
    chunksUsed: chunks.length,
    tokensUsed: response.usage?.total_tokens,
  });

  return { content, sources: chunksToSources(chunks) };
}

/**
 * Streaming RAG completion. Yields content deltas as they arrive.
 */
export async function* generateRAGResponseStream(
  question: string,
  chunks: ChunkWithScore[],
  chatHistory: HistoryMessage[],
  settings?: ChatbotSettingsInput,
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
