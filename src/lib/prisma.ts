import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Set it in your environment or Vercel project settings.");
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    // Pages fire several queries in parallel (Promise.all). A small, warm pool
    // lets them actually run concurrently instead of queueing on one socket,
    // without exhausting a serverless Postgres connection limit.
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

// Reuse one client (and its connection pool) per server process. Caching on
// globalThis in every environment also survives dev hot-reloads, which would
// otherwise open a fresh pool on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
