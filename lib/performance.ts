import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const configuredSlowOperationMs = Number(process.env.PERFORMANCE_SLOW_OPERATION_MS ?? 750);
const SLOW_OPERATION_MS = Number.isFinite(configuredSlowOperationMs) && configuredSlowOperationMs >= 0
  ? configuredSlowOperationMs
  : 750;
type PerformanceStore = { queryCount: number };
const performanceStorage = new AsyncLocalStorage<PerformanceStore>();

export function recordPrismaQuery() {
  const store = performanceStorage.getStore();
  if (store) store.queryCount += 1;
}

export async function measureServerOperation<T>(
  label: string,
  operation: () => Promise<T>,
  context: { route?: string; traceId?: string } = {},
): Promise<T> {
  const startedAt = Date.now();
  const store: PerformanceStore = { queryCount: 0 };
  let status: "ok" | "error" = "ok";
  try {
    return await performanceStorage.run(store, operation);
  } catch (error) {
    status = "error";
    throw error;
  } finally {
    const durationMs = Date.now() - startedAt;
    if (status === "error" || durationMs >= SLOW_OPERATION_MS) {
      console.warn(JSON.stringify({
        type: "server_operation",
        operation: label,
        route: context.route ?? label,
        traceId: context.traceId ?? randomUUID(),
        durationMs,
        queryCount: store.queryCount,
        status,
      }));
    }
  }
}

export { SLOW_OPERATION_MS };
