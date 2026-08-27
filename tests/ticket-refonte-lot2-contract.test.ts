import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("lot 2 ticket industrial visual contract", () => {
  it("keeps the existing inbox scope, queue and claim calculations", () => {
    const inbox = source("app/(app)/inbox/page.tsx");

    expect(inbox).toContain("operationalRoles");
    expect(inbox).toContain("listVisibleTicketsPage(user");
    expect(inbox).toContain("canActorClaimTicket(user, ticket)");
    expect(inbox).toContain("inbox-operations-industrial");

    const visuals = source("components/dashboard-visuals.tsx");
    expect(visuals).toContain("dashboard-avatar-assignee");
    expect(visuals).toContain("dashboard-avatar-watch");
  });

  it("keeps idempotent ticket creation and its existing API contracts", () => {
    const form = source("components/new-ticket-form.tsx");

    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain('fetch("/api/tickets", {');
    expect(form).toContain('fetch("/api/departments", { signal: controller.signal })');
    expect(form).toContain("ticket-composer-industrial");
  });

  it("keeps protected ticket detail retrieval and contextual actions", () => {
    const detail = source("app/(app)/tickets/[id]/page.tsx");

    expect(detail).toContain("getTicketForViewer(user");
    expect(detail).toContain("getTicketActionContext(user, ticket)");
    expect(detail).toContain("TicketCommentThread");
    expect(detail).toContain("ticket-detail-industrial");
  });

  it("contains a scoped lot 2 palette without new blue or violet accents", () => {
    const css = source("app/globals.css");
    const lotTwo = css.slice(css.indexOf("Lot 2 — flux ticket industriel"));

    expect(lotTwo).toContain(".inbox-operations-industrial");
    expect(lotTwo).toContain(".ticket-create-industrial");
    expect(lotTwo).toContain(".ticket-detail-industrial");
    expect(lotTwo).not.toMatch(/blue|cyan|indigo|violet|#4c4dba|#5b5bd6/i);
  });
});
