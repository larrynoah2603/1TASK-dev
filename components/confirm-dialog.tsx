"use client";

import { useEffect } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <p className="eyebrow">Confirmation requise</p>
        <h2 id="confirm-dialog-title" className="mt-2 text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" disabled={busy} onClick={onCancel} className="button-secondary">{cancelLabel}</button>
          <button type="button" disabled={busy} onClick={onConfirm} className={danger ? "button-danger" : "button-primary"}>{busy ? "Traitement…" : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
