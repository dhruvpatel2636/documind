import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../config/env";
import { logger } from "../logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  const client = new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? [{ emit: "event", level: "query" }, "error", "warn"]
        : ["error"],
  });

  client.$on("query" as never, (e: { query: string; duration: number }) => {
    if (env.NODE_ENV === "development") {
      logger.debug(`Query: ${e.query} (${e.duration}ms)`);
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
