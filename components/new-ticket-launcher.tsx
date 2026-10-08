"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { NewTicketForm } from "@/components/new-ticket-form";
import { Icon } from "@/components/ui/icons";

export function NewTicketLauncher({ simplified = false }: { simplified?: boolean }) {
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
          <div className="ticket-launcher-heading">
            <h2 id="new-ticket-modal-title">Nouveau ticket</h2>
            <p>Décrivez votre besoin, nous nous chargeons du routage.</p>
          </div>
          <button type="button" className="modal-close-button" onClick={() => setOpen(false)} aria-label="Fermer la fenêtre">×</button>
        </header>
        <div className="ticket-launcher-modal-body"><NewTicketForm simplified={simplified} onCancel={() => setOpen(false)} /></div>
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="kit-btn kit-btn-primary kit-new-ticket new-ticket-launcher" aria-haspopup="dialog" aria-expanded={open} aria-label="Nouveau ticket">
        <Icon name="plus" />
        <span className="kit-hide-mobile">Nouveau ticket</span>
      </button>
      {modal}
    </>
  );
}
