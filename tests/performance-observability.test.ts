import { describe, expect, it, vi } from "vitest";
import { measureServerOperation, recordPrismaQuery } from "@/lib/performance";

describe("observabilité serveur", () => {
  it("journalise une erreur sans données métier et compte les requêtes", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(measureServerOperation("tickets.list", async () => {
      recordPrismaQuery();
      throw new Error("secret qui ne doit pas être journalisé");
    }, { route: "/api/tickets", traceId: "trace-test" })).rejects.toThrow();
    const event = JSON.parse(String(warn.mock.calls[0]?.[0]));
    expect(event).toMatchObject({ operation: "tickets.list", route: "/api/tickets", traceId: "trace-test", queryCount: 1, status: "error" });
    expect(JSON.stringify(event)).not.toContain("secret qui ne doit pas être journalisé");
    warn.mockRestore();
  });
});
