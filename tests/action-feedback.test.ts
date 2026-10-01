import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { normalizeToastInput, ToastCard } from "@/components/toast-provider";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("retours d'action 1TASK", () => {
  it("conserve l'API toast simple et normalise les notifications riches", () => {
    expect(normalizeToastInput("Enregistré")).toMatchObject({ title: "Enregistré", kind: "success" });
    expect(normalizeToastInput("Refusé", "error")).toMatchObject({ title: "Refusé", kind: "error" });
    expect(normalizeToastInput({ kind: "warning", title: "À vérifier", description: "Contrôle requis", metadata: "INC-1" }))
      .toMatchObject({ kind: "warning", title: "À vérifier", description: "Contrôle requis", metadata: "INC-1" });
  });

  it("rend le titre, la description, les métadonnées, l'action et les rôles accessibles", () => {
    const success = renderToStaticMarkup(createElement(ToastCard, { item: { id: 1, closing: false, duration: 5_000, kind: "success", title: "Ticket créé", description: "Demande transmise.", metadata: "INC-1 · Nouveau", action: { label: "Voir le ticket", href: "/tickets/1" } }, onClose: vi.fn() }));
    expect(success).toContain('role="status"');
    expect(success).toContain("Ticket créé");
    expect(success).toContain("Demande transmise.");
    expect(success).toContain("INC-1 · Nouveau");
    expect(success).toContain('href="/tickets/1"');
    expect(success).toContain("Voir le ticket");
    expect(success).toContain("Fermer la notification : Ticket créé");

    const error = renderToStaticMarkup(createElement(ToastCard, { item: { id: 2, closing: false, duration: 5_000, kind: "error", title: "Échec" }, onClose: vi.fn() }));
    expect(error).toContain('role="alert"');
  });

  it("ferme explicitement un toast et rejette une action externe", () => {
    const provider = source("components/toast-provider.tsx");
    expect(provider).toContain("onClick={() => onClose(item.id)}");
    expect(provider).toContain("input.action.href.startsWith(\"//\")");
    expect(normalizeToastInput({ title: "Test", action: { label: "Externe", href: "//example.com" as `/${string}` } }).action).toBeUndefined();
  });
});

describe("création de ticket fiable", () => {
  const form = source("components/new-ticket-form.tsx");

  it("bloque immédiatement un double submit et expose l'état occupé", () => {
    expect(form).toContain("if (submissionInFlight.current) return");
    expect(form).toContain("submissionInFlight.current = true");
    expect(form).toContain("submissionInFlight.current = false");
    expect(form).toContain('aria-busy={submitting}');
    expect(form).toContain("Création du ticket…");
    expect(form).toContain("disabled={submitting || loadingDepartments}");
  });

  it("n'affiche le succès qu'après confirmation serveur et garde l'idempotence", () => {
    const responseCheck = form.indexOf("if (!response.ok)");
    const successToast = form.indexOf('title: "Ticket créé"', responseCheck);
    expect(responseCheck).toBeGreaterThan(-1);
    expect(successToast).toBeGreaterThan(responseCheck);
    expect(form).toContain("creationIdempotencyToken");
    expect(form).toContain("/api/tickets/creation-status?token=");
    expect(form).toContain('action: { label: "Voir le ticket", href: `/tickets/${data.id}` }');
  });

  it("restaure l'action et affiche l'erreur réelle après un échec", () => {
    expect(form).toContain('toast(data.error ?? "La création a échoué.", "error")');
    expect(form).toContain("setSubmitting(false)");
    expect(form).toContain("l’identifiant conservé empêchera tout doublon");
  });
});
