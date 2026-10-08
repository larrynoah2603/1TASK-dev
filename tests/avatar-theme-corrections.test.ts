import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("avatar and ticket theme corrections", () => {
  it("reuses the signed-in user photo in the admin profile menu", () => {
    const adminShell = source("components/admin-shell.tsx");

    expect(adminShell).toContain(
      '<ProfileMenu name={user.name} email={user.email} image={user.image} department="Console d’administration"',
    );
  });

  it("loads and renders the requester photo on ticket detail", () => {
    const access = source("lib/ticket-access.ts");
    const domain = source("lib/domain/ticket.ts");
    const page = source("app/(app)/tickets/[id]/page.tsx");

    expect(access).toContain("requester: { select: { id: true, name: true, image: true } }");
    expect(domain).toContain("requester: { id: string; name: string; image: string | null }");
    expect(page).toContain("image={ticket.requester.image}");
    expect(page).toContain('size="lg"');
    expect(page).toContain('className="ticket-requester-avatar"');
  });

  it("keeps avatars fully rounded and lets images inherit the avatar radius", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain("border-radius: var(--kit-radius-pill)");
    expect(css).toContain(".kit-avatar img { display: block;");
    expect(css).toContain("border-radius: inherit");
  });

  it("overrides legacy black ticket controls with theme tokens", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain(
      "html[data-theme] .shell-industrial .ticket-detail-industrial .field-control",
    );
    expect(css).toContain("background: var(--kit-surface)");
    expect(css).toContain(
      "html[data-theme] .shell-industrial .ticket-detail-industrial .ticket-side-panel-chevron",
    );
    expect(css).toContain("background: var(--kit-surface-muted)");
    expect(css).toContain("background: var(--kit-selected)");
    expect(css).toContain(
      "html[data-theme] .shell-industrial .ticket-detail-industrial .combobox-listbox",
    );
  });
});
