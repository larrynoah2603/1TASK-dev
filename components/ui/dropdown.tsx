"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

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
  const panelId = useId();
  const ref = useDismissable<HTMLDivElement>(open, close);

  const handlePanelKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close();
    triggerRef.current?.focus();
  }, [close]);
  return (
    <div
      ref={ref}
      className="kit-anchor"
      onBlurCapture={(event) => {
        // A menu left by Tab must not remain visually open behind the next control.
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <button ref={triggerRef} type="button" className={triggerClassName} aria-label={triggerLabel} title={triggerLabel} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-haspopup={role} onClick={() => setOpen((value) => !value)}>
        {triggerContent}
      </button>
      {open ? (
        <div id={panelId} className={`kit-popover${align === "left" ? " kit-popover-left" : ""} ${panelClassName}`.trim()} role={role} aria-label={triggerLabel} onKeyDown={handlePanelKeyDown}>
          {typeof children === "function" ? children(close) : children}
        </div>
      ) : null}
    </div>
  );
}
