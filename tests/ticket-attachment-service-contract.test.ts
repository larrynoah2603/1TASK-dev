import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("module des pièces jointes", () => {
  it("isole le stockage fichier du service métier principal", () => {
    const ticketService = source("lib/ticket-service.ts");
    const attachmentService = source("lib/ticket-attachment-service.ts");

    expect(ticketService).not.toContain('from "node:fs/promises"');
    expect(attachmentService).toContain('from "node:fs/promises"');
    expect(attachmentService).toContain("requireTicketAccess(ticketId)");
    expect(attachmentService).toContain("unlink(storagePath).catch");
  });

  it("branche les deux routes de pièces jointes sur le module dédié", () => {
    const collectionRoute = source("app/api/tickets/[id]/attachments/route.ts");
    const itemRoute = source("app/api/tickets/[id]/attachments/[attachmentId]/route.ts");

    expect(collectionRoute).toContain('from "@/lib/ticket-attachment-service"');
    expect(itemRoute).toContain('from "@/lib/ticket-attachment-service"');
  });
});
