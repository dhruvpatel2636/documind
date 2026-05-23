import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use transaction pooler (port 6543) — direct connection not available
    url: env("DATABASE_URL"),
  },
});
