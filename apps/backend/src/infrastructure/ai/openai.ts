import OpenAI from "openai";
import { env } from "../../config/env";

/**
 * Single OpenRouter client used for both chat completions and embeddings.
 * OpenRouter exposes an OpenAI-compatible API.
 */
export const openrouter = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": env.FRONTEND_URL,
    "X-Title": "DocuMind",
  },
});

export const CHAT_MODEL = env.OPENROUTER_CHAT_MODEL;
export const EMBEDDING_MODEL = env.OPENROUTER_EMBEDDING_MODEL;

/**
 * Vector dimensions for the configured embedding model.
 * baai/bge-large-en-v1.5 → 1024. If you switch to a model with different
 * dimensions, also update the `vector(1024)` column in schema.prisma.
 */
export const EMBEDDING_DIMENSIONS = 1024;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openrouter.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, " "),
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("Embedding API returned no data");
  return embedding;
}
