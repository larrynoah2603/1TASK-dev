import "dotenv/config";

import { readServerEnvironment } from "../lib/env";

const requestedMode = process.argv[2];

if (requestedMode && !["development", "test", "production"].includes(requestedMode)) {
  throw new Error(`Mode d’environnement inconnu : ${requestedMode}`);
}

readServerEnvironment({
  ...process.env,
  ...(requestedMode ? { NODE_ENV: requestedMode } : {}),
});

console.log("Configuration d’environnement valide.");