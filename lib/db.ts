import { PrismaClient } from "@prisma/client";
import { recordPrismaQuery } from "@/lib/performance";
import { readServerEnvironment } from "@/lib/env";

const environment = readServerEnvironment();

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      ...(environment.NODE_ENV === "development" ? [{ emit: "stdout" as const, level: "warn" as const }] : []),
    ],
  });
  client.$on("query", recordPrismaQuery);
  return client as PrismaClient;
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (environment.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
