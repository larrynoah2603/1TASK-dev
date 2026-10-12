"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "1task-bios-glass-preview";
const PROFILE = "bios-glass-v31";

/** Mounted only by RootLayout in development or a Vercel Preview deployment.
 * Never persists a visual preference to the database or a production cookie. */
export function BiosGlassPreviewToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = false;
    try {
      active = window.sessionStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      // Storage can be blocked: the preview remains fully reversible.
    }
    if (active) document.documentElement.dataset.visualProfile = PROFILE;
    else delete document.documentElement.dataset.visualProfile;
    const timer = window.setTimeout(() => setEnabled(active), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function togglePreview() {
    const next = !enabled;
    if (next) document.documentElement.dataset.visualProfile = PROFILE;
    else delete document.documentElement.dataset.visualProfile;
    setEnabled(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Keep the in-session switch working without browser storage.
    }
  }

  return (
    <button
      type="button"
      className="bios-glass-preview-toggle"
      aria-pressed={enabled}
      aria-label={enabled ? "Désactiver l’aperçu BIOS Glass et revenir au thème 1TASK" : "Activer l’aperçu BIOS Glass v3.1"}
      onClick={togglePreview}
      title="Prévisualisation : ne change ni vos données ni les paramètres de production"
    >
      {enabled ? "BIOS Glass · Actif — Revenir à 1TASK" : "Tester BIOS Glass v3.1"}
    </button>
  );
}
