import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

import { assertProductionDatabaseUrl } from "@/lib/database-runtime";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

assertProductionDatabaseUrl(databaseUrl);

const globalForPrisma = globalThis as typeof globalThis & {
  roadWatchAdapter?: PrismaBetterSqlite3;
  roadWatchPrisma?: PrismaClient;
};

const adapter =
  globalForPrisma.roadWatchAdapter ??
  new PrismaBetterSqlite3({
    url: databaseUrl,
  });

export const prisma =
  globalForPrisma.roadWatchPrisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.roadWatchAdapter = adapter;
  globalForPrisma.roadWatchPrisma = prisma;
}
