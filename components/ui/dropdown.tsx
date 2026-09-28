"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function Dropdown({ trigger, children, align = "right" }: { trigger: (props: { open: boolean; toggle: () => void }) => ReactNode; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); }; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("mousedown", close); window.addEventListener("keydown", escape); return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", escape); }; }, [open]);
  return <div ref={ref} className="ds-dropdown">{trigger({ open, toggle: () => setOpen((value) => !value) })}{open ? <div className={`ds-dropdown-menu ds-dropdown-${align}`} role="menu">{children}</div> : null}</div>;
}
export function DropdownItem({ children, danger = false, onSelect }: { children: ReactNode; danger?: boolean; onSelect?: () => void }) { return <button type="button" role="menuitem" onClick={onSelect} className={`ds-dropdown-item ${danger ? "ds-dropdown-item-danger" : ""}`}>{children}</button>; }
