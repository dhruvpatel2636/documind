import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

// Single OpenRouter client for both chat and embeddings
export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
    "X-Title": "RAG Chatbot Platform",
  },
});

// Free chat model via OpenRouter
export const CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL || "google/gemini-2.0-flash-001";

// Embedding model via OpenRouter — qwen/qwen3-embedding-0.6b outputs 1024 dims
// If you switch to openai/text-embedding-3-small, change this to 1536 and
// update the vector(1024) column in schema.prisma accordingly.
export const EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL || "qwen/qwen3-embedding-0.6b";

export const EMBEDDING_DIMENSIONS = 1024;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openrouter.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, " "),
  });
  return response.data[0].embedding;
}
