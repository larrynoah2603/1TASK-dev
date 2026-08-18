"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { NewTicketForm } from "@/components/new-ticket-form";

export function NewTicketLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const modal = open && typeof document !== "undefined" ? createPortal(
    <div className="modal-backdrop ticket-launcher-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="modal-panel ticket-launcher-modal" role="dialog" aria-modal="true" aria-labelledby="new-ticket-modal-title" onMouseDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
        <header className="ticket-launcher-modal-header">
          <div><p className="eyebrow">Création rapide</p><h2 id="new-ticket-modal-title">Nouveau ticket</h2><p className="mt-1 text-xs text-slate-500">Votre demande sera routée selon le catalogue existant.</p></div>
          <button type="button" className="modal-close-button" onClick={() => setOpen(false)} aria-label="Fermer la fenêtre">×</button>
        </header>
        <div className="ticket-launcher-modal-body"><NewTicketForm onCancel={() => setOpen(false)} /></div>
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="new-ticket-launcher" aria-haspopup="dialog" aria-expanded={open}>
        <span className="new-ticket-launcher-icon" aria-hidden="true">+</span>
        <span className="hidden sm:inline">Nouveau ticket</span>
        <span className="sm:hidden">Nouveau</span>
        <span className="new-ticket-launcher-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5" /></svg></span>
      </button>
      {modal}
    </>
  );
}
