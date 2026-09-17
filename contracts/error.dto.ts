export interface ErrorDTO {
  /** User-safe message. */
  message: string;
  /** Backward-compatible alias consumed by the existing frontend. */
  error: string;
  code: string;
  traceId: string;
  context: {
    status: number;
    category: string;
    details?: unknown;
  };
}
