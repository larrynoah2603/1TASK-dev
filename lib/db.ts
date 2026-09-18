import { PrismaClient } from "@prisma/client";
import { recordPrismaQuery } from "@/lib/performance";



function createPrismaClient() {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      ...(nodeEnv === "development"
        ? [{ emit: "stdout" as const, level: "warn" as const }]
        : []),
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}