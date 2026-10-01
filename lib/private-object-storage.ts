import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { readServerEnvironment } from "@/lib/env";

export interface PrivateObjectStorage {
  put(key: string, content: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function localStorage(): PrivateObjectStorage {
  const root = path.join(process.cwd(), "var", "ticket-attachments");
  const objectPath = (key: string) => {
    const resolved = path.resolve(root, key);
    if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error("Invalid private object key");
    return resolved;
  };
  return {
    async put(key, content) { const target = objectPath(key); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); },
    get: (key) => readFile(objectPath(key)),
    async delete(key) { await unlink(objectPath(key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; }); },
  };
}

function remoteStorage(endpoint: string, token: string): PrivateObjectStorage {
  const objectUrl = (key: string) => `${endpoint.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const request = async (key: string, init: RequestInit) => {
    const response = await fetch(objectUrl(key), { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Private storage returned ${response.status}`);
    return response;
  };
  return {
    async put(key, content, contentType) { await request(key, { method: "PUT", headers: { "Content-Type": contentType, "Content-Length": String(content.length) }, body: new Uint8Array(content) }); },
    async get(key) { return Buffer.from(await (await request(key, { method: "GET" })).arrayBuffer()); },
    async delete(key) { await request(key, { method: "DELETE" }); },
  };
}

/** Production never falls back to an ephemeral application directory. Objects
 * are fetched through the application so ticket authorization is rechecked on
 * every download; the adapter never creates public or reusable URLs. */
export function privateObjectStorage(): PrivateObjectStorage {
  const environment = readServerEnvironment();
  if (environment.PRIVATE_STORAGE_URL && environment.PRIVATE_STORAGE_TOKEN) {
    return remoteStorage(environment.PRIVATE_STORAGE_URL, environment.PRIVATE_STORAGE_TOKEN);
  }
  if (environment.NODE_ENV === "production") throw new Error("Le stockage privé durable n’est pas configuré.");
  return localStorage();
}
