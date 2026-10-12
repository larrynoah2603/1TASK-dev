"use client";

import { useId } from "react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  busy = false,
  confirmDisabled = false,
  busyLabel = "Traitement…",
  children,
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
  confirmDisabled?: boolean;
  busyLabel?: string;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const dialogRef = useDialogFocus({ open, onClose: onCancel, closeOnEscape: !busy });

  if (!open) return null;

  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <p className="eyebrow">Confirmation requise</p>
        <h2 id={titleId} className="mt-2 text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {children}
        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" disabled={busy} onClick={onCancel} className="button-secondary">{cancelLabel}</button>
          <button type="button" disabled={busy || confirmDisabled} onClick={onConfirm} className={danger ? "button-danger" : "button-primary"}>{busy ? busyLabel : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
