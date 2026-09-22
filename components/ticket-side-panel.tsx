"use client";

import { useState } from "react";

export function TicketSidePanel({
  title,
  subtitle,
  count,
  defaultOpen = false,
  children,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`ticket-side-panel${open ? " ticket-side-panel-open" : ""}`}>
      <button
        type="button"
        className="ticket-side-panel-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => { const next = !value; if (next) onOpen?.(); return next; })}
      >
        <span className="min-w-0 text-left">
          <span className="ticket-side-panel-title">{title}</span>
          {subtitle ? <span className="ticket-side-panel-subtitle">{subtitle}</span> : null}
        </span>
        <span className="ticket-side-panel-meta">
          {typeof count === "number" ? <span className="ticket-side-panel-count">{count}</span> : null}
          <span className="ticket-side-panel-chevron" aria-hidden="true">{open ? "⌃" : "⌄"}</span>
        </span>
      </button>
      {open ? <div className="ticket-side-panel-content">{children}</div> : null}
    </section>
  );
}
