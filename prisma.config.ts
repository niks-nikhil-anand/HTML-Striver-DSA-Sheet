import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations and the CLI use the DIRECT (non-pooled) connection string when one is set
// (Neon, Vercel Postgres). The running app uses the pooled DATABASE_URL via the driver adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
