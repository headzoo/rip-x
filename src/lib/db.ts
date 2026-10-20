import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { ripXPrisma?: PrismaClient };

export function getDatabase(): PrismaClient {
  if (globalDb.ripXPrisma) return globalDb.ripXPrisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  const hostname = new URL(connectionString).hostname;
  // Support isolated local PostgreSQL for tests/development, never a fake store.
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  const adapter = local
    ? new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 10_000 })
    : new PrismaNeon({ connectionString, max: 5, connectionTimeoutMillis: 10_000 });

  globalDb.ripXPrisma = new PrismaClient({ adapter, log: [] });
  return globalDb.ripXPrisma;
}
