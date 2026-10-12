"use client";

import { useId, type ReactNode } from "react";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { X } from "lucide-react";

export function Modal({ open, title, description, children, footer, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useDialogFocus({ open, onClose });
  if (!open) return null;
  return <div className="ds-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="ds-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}><header><div><h2 id={titleId}>{title}</h2>{description ? <p>{description}</p> : null}</div><button type="button" onClick={onClose} aria-label="Fermer"><X className="size-4" /></button></header><div className="ds-modal-content">{children}</div>{footer ? <footer>{footer}</footer> : null}</section></div>;
}
