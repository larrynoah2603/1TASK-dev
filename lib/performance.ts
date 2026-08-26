const SLOW_OPERATION_MS = 750;

export async function measureServerOperation<T>(label: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await operation();
  } finally {
    const durationMs = Date.now() - startedAt;
    if (durationMs >= SLOW_OPERATION_MS) {
      console.warn(`[perf] ${label} ${durationMs}ms`);
    }
  }
}

export { SLOW_OPERATION_MS };
