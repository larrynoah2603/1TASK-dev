"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Ferme un popover au clic extérieur et à la touche Échap (logique auparavant dupliquée dans 3 menus). */
export function useDismissable<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

/** Menu déroulant générique : déclencheur + panneau ancré. `children` peut recevoir `close`. */
export function Dropdown({
  triggerLabel,
  triggerContent,
  triggerClassName = "kit-icon-btn",
  align = "right",
  panelClassName = "",
  role = "menu",
  children,
}: {
  triggerLabel: string;
  triggerContent: ReactNode;
  triggerClassName?: string;
  align?: "left" | "right";
  panelClassName?: string;
  role?: "menu" | "dialog";
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ref = useDismissable<HTMLDivElement>(open, close);
  return (
    <div ref={ref} className="kit-anchor" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    }}>
      <button ref={triggerRef} type="button" className={triggerClassName} aria-label={triggerLabel} title={triggerLabel} aria-expanded={open} aria-haspopup={role} onClick={() => setOpen((value) => !value)}>
        {triggerContent}
      </button>
      {open ? (
        <div className={`kit-popover${align === "left" ? " kit-popover-left" : ""} ${panelClassName}`.trim()} role={role} aria-label={triggerLabel}>
          {typeof children === "function" ? children(close) : children}
        </div>
      ) : null}
    </div>
  );
}
