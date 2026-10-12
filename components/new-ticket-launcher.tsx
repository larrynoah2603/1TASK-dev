"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { NewTicketForm } from "@/components/new-ticket-form";
import { Icon } from "@/components/ui/icons";

export function NewTicketLauncher({ simplified = false }: { simplified?: boolean }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useDialogFocus({ open, onClose: () => setOpen(false) });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const modal = open && typeof document !== "undefined" ? createPortal(
    <div className="modal-backdrop ticket-launcher-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className={`modal-panel ticket-launcher-modal${simplified ? " ticket-launcher-modal-v1" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef} onMouseDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
        <header className={`ticket-launcher-modal-header${simplified ? " ticket-launcher-modal-header-v1" : ""}`}>
          <div>
            {!simplified ? <p className="eyebrow">Création rapide</p> : null}
            <h2 id={titleId}>Nouveau ticket</h2>
            <p className="ticket-launcher-modal-description">
              {simplified
                ? "Décrivez votre besoin, 1TASK se charge du routage. Après création, vous serez redirigé vers le ticket pour suivre son traitement."
                : "Décrivez votre besoin ; le catalogue le route directement lorsqu’une correspondance fiable existe."}
            </p>
          </div>
          <button type="button" className="modal-close-button" onClick={() => setOpen(false)} aria-label="Fermer la fenêtre">×</button>
        </header>
        <div className="ticket-launcher-modal-body"><NewTicketForm simplified={simplified} onCancel={() => setOpen(false)} onCreated={() => setOpen(false)} /></div>
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
