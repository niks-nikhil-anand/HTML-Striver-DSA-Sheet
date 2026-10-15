import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/prisma-client/client";

// One PrismaClient per server instance. Cached on globalThis in dev so hot reloads
// don't open a new connection pool on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Created on first use, not at import, so `next build` works on machines without DATABASE_URL
 * and only requests that actually touch the database need it.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, prop) => Reflect.get(getClient(), prop),
});
