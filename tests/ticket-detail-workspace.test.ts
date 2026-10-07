import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ticket detail treatment workspace", () => {
  it("organizes the ticket around treatment, demand and local activity tabs", () => {
    const page = source("app/(app)/tickets/[id]/page.tsx");

    expect(page).toContain("ticket-detail-workspace");
    expect(page).toContain("ticket-treatment-sticky");
    expect(page).toContain("<TicketWorkspaceTabs");
    expect(page).toContain('title="Demande"');
    expect(page).toContain('title="Informations"');
    expect(page).toContain("ticket-treatment-heading");
    expect(page).toContain("workspaceMode");
    expect(source("components/ticket-actions.tsx")).toContain("ticket-action-disclosure");
  });

  it("keeps comments in exchanges instead of duplicating them in history", () => {
    const page = source("app/(app)/tickets/[id]/page.tsx");

    expect(page).toContain("Les messages restent dans Échanges");
    expect(page).toContain("...ticket.events.map");
    expect(page).toContain("...ticket.assignments.map");
    expect(page).not.toContain('...ticket.messages.map((message) => ({ kind: "message"');
  });

  it("embeds ticket attachments inside the files tab without losing upload logic", () => {
    const page = source("app/(app)/tickets/[id]/page.tsx");
    const advanced = source("components/ticket-advanced-panels.tsx");

    expect(page).toContain('only="attachments" embedded');
    expect(advanced).toContain("props.embedded");
    expect(advanced).toContain("void loadAttachments()");
    expect(advanced).toContain("uploadAttachment");
  });

  it("uses the compact four-step V1 strip without duplicating the expanded SLA block", () => {
    const strip = source("components/ticket-status-strip.tsx");
    const css = source("styles/design-system.css");

    expect(strip).toContain("kit-stepper-v1");
    expect(strip).toContain("!simplifiedV1");
    expect(css).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
  });

  it("does not change protected retrieval or contextual authorization", () => {
    const page = source("app/(app)/tickets/[id]/page.tsx");

    expect(page).toContain("getTicketForViewer(user, ticketId)");
    expect(page).toContain("getTicketActionContext(user, ticket)");
    expect(page).toContain("{...actionContext}");
  });
});
