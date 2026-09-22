import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = () => readFileSync(resolve(process.cwd(), "lib/ticket-query-service.ts"), "utf8");
describe("curseurs keyset des tickets", () => {
  it("encode les colonnes réellement utilisées par chaque tri", () => {
    const code = source();
    expect(code).toContain('sort, createdAt: ticket.createdAt.toISOString()');
    expect(code).toContain('sort, status: ticket.status, updatedAt: ticket.updatedAt.toISOString()');
    expect(code).toContain('sort, updatedAt: ticket.updatedAt.toISOString()');
  });
  it("applique une frontière lexicographique au lieu d’un cursor Prisma fondé uniquement sur id", () => {
    const code = source();
    expect(code).toContain("ticketCursorBoundary(cursor)");
    expect(code).not.toContain("cursor: { id: cursor.id }");
    expect(code).toContain("{ updatedAt: { lt: updatedAt } }");
    expect(code).toContain("{ createdAt: { gt: createdAt } }");
  });
});
