import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Client generation does not connect to the database. Keep it usable in
    // preview startup even when the shell does not inherit project env vars;
    // migrations and runtime validation still require the real DATABASE_URL.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/ticketing",
  },
});
