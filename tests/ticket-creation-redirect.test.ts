import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ticket creation redirect", () => {
  it("redirects the simplified form only after a valid created ticket id is returned", () => {
    const form = source("components/v1-ticket-form.tsx");

    expect(form).toContain("if (!response.ok || !data.id)");
    expect(form).toContain("onCreated?.(data.id)");
    expect(form).toContain("router.push(`/tickets/${data.id}`)");
    expect(form.indexOf("onCreated?.(data.id)")).toBeLessThan(
      form.indexOf("router.push(`/tickets/${data.id}`)"),
    );
  });

  it("redirects the full form only after confirmed creation", () => {
    const form = source("components/new-ticket-form.tsx");

    expect(form).toContain("if (!response.ok || !data.id)");
    expect(form).toContain("onCreated?.(data.id)");
    expect(form).toContain("router.push(`/tickets/${data.id}`)");
    expect(form).toContain("onCreated?.(reconciledTicket.id)");
    expect(form).toContain("router.push(`/tickets/${reconciledTicket.id}`)");
  });

  it("closes the persistent launcher before the created ticket becomes visible", () => {
    const launcher = source("components/new-ticket-launcher.tsx");
    const form = source("components/new-ticket-form.tsx");

    expect(launcher).toContain("onCreated={() => setOpen(false)}");
    expect(form).toContain("onCreated?: (ticketId: string) => void");
    expect(form).toContain("<V1TicketForm onCancel={onCancel} onCreated={onCreated} />");
    expect(form).toContain("<FullTicketForm onCancel={onCancel} onCreated={onCreated} />");
  });

  it("keeps reconciliation redirect behavior when the POST response times out", () => {
    const simplified = source("components/v1-ticket-form.tsx");
    const full = source("components/new-ticket-form.tsx");

    expect(simplified).toContain("/api/tickets/creation-status?token=");
    expect(simplified).toContain("onCreated?.(data.ticket.id)");
    expect(full).toContain("/api/tickets/creation-status?token=");
    expect(full).toContain("onCreated?.(reconciledTicket.id)");
  });
});
