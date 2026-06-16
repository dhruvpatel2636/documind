import "dotenv/config";
import { z } from "zod";

/**
 * Validated environment configuration.
 *
 * Fails fast at startup if required env vars are missing or malformed.
 * Import `env` everywhere instead of reading `process.env` directly.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "debug"])
    .default("info"),

  // URLs
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1),

  // AI
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_CHAT_MODEL: z
    .string()
    .default("meta-llama/llama-3.3-70b-instruct:free"),
  OPENROUTER_EMBEDDING_MODEL: z.string().default("baai/bge-large-en-v1.5"),

  // Storage
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
