import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { logger } from "./infrastructure/logger";
import {
  errorHandler,
  notFoundHandler,
} from "./shared/middleware/error.middleware";

import { documentRouter } from "./modules/document";
import { chatRouter } from "./modules/chat";
import { settingsRouter } from "./modules/settings";

/**
 * Build a fully-wired Express application.
 * Kept separate from the HTTP listener so the app can be exercised
 * in tests without binding a port.
 */
export function createApp(): Express {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Global rate limit on /api
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Logging — pipe morgan into winston
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }),
  );

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Feature routes
  app.use("/api/documents", documentRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/settings", settingsRouter);

  // 404 + error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
