import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("UI/UX foundation — all app surfaces", () => {
  it("keeps the approved 1TASK palette and defines every shared spacing token", () => {
    const tokens = source("styles/tokens.css");
    const css = [tokens, source("styles/design-system.css"), source("styles/legacy-bridge.css")].join("\n");
    const definitions = new Set([...css.matchAll(/(--kit-[\w-]+)\s*:/g)].map((match) => match[1]));
    const references = [...css.matchAll(/var\((--kit-[\w-]+)/g)].map((match) => match[1]);

    for (const reference of references) expect(definitions.has(reference), reference).toBe(true);
    expect(tokens).toContain("--kit-space-8: 64px");
    expect(tokens).toContain("--kit-brand: #EA7C29");
    expect(tokens).toContain("--kit-primary: #C4510D");
    expect(tokens).toContain("--kit-font: var(--font-ibm-plex-sans)");
  });

  it("gives shared dialogs keyboard focus management and unique accessible names", () => {
    const focus = source("components/ui/use-dialog-focus.ts");
    expect(focus).toContain('event.key === "Tab"');
    expect(focus).toContain('event.key === "Escape"');
    expect(focus).toContain("previousFocus.focus()");
    expect(focus).toContain("focusableElements");

    for (const path of [
      "components/confirm-dialog.tsx",
      "components/new-ticket-launcher.tsx",
      "components/asset-request-dialog.tsx",
      "components/ui/modal.tsx",
    ]) {
      const file = source(path);
      expect(file, path).toContain("useDialogFocus");
      expect(file, path).toContain("tabIndex={-1}");
      expect(file, path).toContain("ref={dialogRef}");
      expect(file, path).toContain("aria-labelledby={titleId}");
      expect(file, path).toContain("useId");
    }
  });

  it("preserves one global new-ticket trigger and the V1 creation contract", () => {
    const launcher = source("components/new-ticket-launcher.tsx");
    const appShell = source("components/app-shell.tsx");
    const v1 = source("components/v1-ticket-form.tsx");

    expect(appShell).toContain("<NewTicketLauncher ");
    expect(launcher).toContain("onCreated={() => setOpen(false)}");
    expect(launcher).toContain("Décrivez votre besoin, 1TASK se charge du routage.");
    expect(v1).toContain("creationIdempotencyToken");
    expect(v1).toContain("router.push(`/tickets/${data.id}`)");
  });
});
