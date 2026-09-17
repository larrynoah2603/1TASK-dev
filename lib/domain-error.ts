export class DomainError extends Error {
  statusCode: number;
  code?: string;
  context?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, code?: string, context?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
  }
}
