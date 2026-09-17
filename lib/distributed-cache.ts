import { readServerEnvironment } from "@/lib/env";

const inFlight = new Map<string, Promise<unknown>>();

function configuration() {
  const environment = readServerEnvironment();
  const url = environment.REDIS_REST_URL?.replace(/\/$/, "");
  const token = environment.REDIS_REST_TOKEN;
  return !environment.CACHE_ENABLED || !url || !token ? null : { url, token };
}

async function command<T>(parts: (string | number)[]): Promise<T | null> {
  const config = configuration();
  if (!config) return null;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(parts),
      signal: AbortSignal.timeout(500),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

export async function deleteCacheKey(key: string) {
  await command<number>(["DEL", key]);
}

export async function cacheAside<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const config = configuration();
  if (config) {
    const cached = await command<string>(["GET", key]);
    if (cached) {
      try { return JSON.parse(cached) as T; } catch { await deleteCacheKey(key); }
    }
  }
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const load = loader().then(async (value) => {
    if (config) {
      const jitter = Math.floor(ttlSeconds * (0.9 + Math.random() * 0.2));
      await command(["SET", key, JSON.stringify(value), "EX", Math.max(1, jitter)]);
    }
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, load);
  return load;
}
