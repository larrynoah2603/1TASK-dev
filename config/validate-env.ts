import dotenv from "dotenv";
import { readServerEnvironment } from "../lib/env";

// Next.js loads .env.development.local for the app, but standalone predev
// scripts do not. Load the same project-managed environment before validation
// and Prisma generation, without overriding explicitly exported variables.
dotenv.config({ path: "/vercel/share/.env.project" });
dotenv.config({ path: ".env.development.local" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const requestedMode = process.argv[2];

if (requestedMode && !["development", "test", "production"].includes(requestedMode)) {
  throw new Error(`Mode d’environnement inconnu : ${requestedMode}`);
}

readServerEnvironment({
  ...process.env,
  ...(requestedMode ? { NODE_ENV: requestedMode } : {}),
});

console.log("Configuration d’environnement valide.");
