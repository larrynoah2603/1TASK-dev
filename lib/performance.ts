import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const configuredSlowOperationMs = Number(process.env.PERFORMANCE_SLOW_OPERATION_MS ?? 750);
const SLOW_OPERATION_MS = Number.isFinite(configuredSlowOperationMs) && configuredSlowOperationMs >= 0
  ? configuredSlowOperationMs
  : 750;
type PerformanceStore = { queryCount: number };
const performanceStorage = new AsyncLocalStorage<PerformanceStore>();
const MAX_OPERATION_SAMPLES = 200;
type OperationAggregate = { count: number; errors: number; durationsMs: number[] };
const operationAggregates = new Map<string, OperationAggregate>();

export type ServerOperationMetric = {
  operation: string;
  count: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  sampleSize: number;
};

function recordServerOperation(operation: string, durationMs: number, failed: boolean) {
  const aggregate = operationAggregates.get(operation) ?? { count: 0, errors: 0, durationsMs: [] };
  aggregate.count += 1;
  if (failed) aggregate.errors += 1;
  aggregate.durationsMs.push(durationMs);
  if (aggregate.durationsMs.length > MAX_OPERATION_SAMPLES) aggregate.durationsMs.shift();
  operationAggregates.set(operation, aggregate);
}

function percentile(sorted: readonly number[], ratio: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

/** Returns process-local metrics; each Node instance owns an independent bounded window. */
export function getServerOperationMetrics(): ServerOperationMetric[] {
  return [...operationAggregates.entries()].map(([operation, aggregate]) => {
    const sorted = [...aggregate.durationsMs].sort((left, right) => left - right);
    return {
      operation,
      count: aggregate.count,
      errorRate: aggregate.count ? aggregate.errors / aggregate.count : 0,
      p50Ms: percentile(sorted, 0.5),
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
      sampleSize: sorted.length,
    };
  }).sort((left, right) => left.operation.localeCompare(right.operation));
}

/** Test-only reset. Do not use this to coordinate metrics between instances. */
export function resetServerOperationMetrics() {
  operationAggregates.clear();
}

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
    recordServerOperation(label, durationMs, status === "error");
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

export { MAX_OPERATION_SAMPLES, SLOW_OPERATION_MS };
