import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V1 ticket form redesign", () => {
  it("keeps the V1 three-field creation contract unchanged", () => {
    const form = source("components/v1-ticket-form.tsx");

    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain("serviceCatalogItemId: serviceCatalogItemId || undefined");
    expect(form).toContain("title, description");
    expect(form).not.toContain("targetDepartmentId");
    expect(form).not.toContain("impact");
    expect(form).not.toContain("urgency");
    expect(form).not.toContain("legalDueAt");
    expect(form).not.toContain("confidential");
  });

  it("presents a single clear request section with guided required fields", () => {
    const form = source("components/v1-ticket-form.tsx");

    expect(form).toContain("Votre demande");
    expect(form).toContain("Impossible d’accéder au VPN");
    expect(form).toContain("Décrivez ce qui se passe, depuis quand");
    expect(form).toContain("Champs obligatoires");
    expect(form).toContain("Automatique recommandé");
  });

  it("keeps automatic routing as the recommended optional service choice", () => {
    const form = source("components/v1-ticket-form.tsx");

    expect(form).toContain("Détection automatique — recommandée");
    expect(form).toContain("Laissez la détection automatique si vous ne savez pas quel service choisir");
    expect(form).toContain("service.queue.department.name");
    expect(form).toContain("service.queue.name");
  });

  it("removes the duplicate V1 introduction from the modal", () => {
    const launcher = source("components/new-ticket-launcher.tsx");

    expect(launcher).toContain("Décrivez votre besoin, nous nous chargeons du routage.");
    expect(launcher).toContain("ticket-launcher-modal-v1");
    expect(launcher).toContain("ticket-launcher-modal-header-v1");
  });

  it("uses a dedicated responsive footer and theme-aware V1 layout", () => {
    const css = source("styles/legacy-bridge.css");

    expect(css).toContain(".v1-ticket-form-actions");
    expect(css).toContain("position: sticky");
    expect(css).toContain(".v1-ticket-service-block");
    expect(css).toContain(".v1-ticket-auto-badge");
    expect(css).toContain("@media (max-width: 640px)");
  });
});
