"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ open, title, description, children, footer, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="ds-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="ds-modal" role="dialog" aria-modal="true" aria-labelledby="ds-modal-title"><header><div><h2 id="ds-modal-title">{title}</h2>{description ? <p>{description}</p> : null}</div><button type="button" onClick={onClose} aria-label="Fermer"><X className="size-4" /></button></header><div className="ds-modal-content">{children}</div>{footer ? <footer>{footer}</footer> : null}</section></div>;
}
