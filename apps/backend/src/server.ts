import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./infrastructure/logger";
import { prisma } from "./infrastructure/database/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Backend server running on port ${env.PORT}`, {
    env: env.NODE_ENV,
  });
});

/**
 * Graceful shutdown — drain in-flight requests, close DB pool.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(async (err) => {
    if (err) {
      logger.error("Error closing HTTP server", { err: err.message });
      process.exit(1);
    }

    try {
      await prisma.$disconnect();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (e) {
      logger.error("Error disconnecting Prisma", {
        err: e instanceof Error ? e.message : String(e),
      });
      process.exit(1);
    }
  });

  // Force-exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { err: err.message, stack: err.stack });
  void shutdown("uncaughtException");
});
