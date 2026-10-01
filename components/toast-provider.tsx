"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastKind = "success" | "error" | "info" | "warning";

export type RichToast = {
  kind?: ToastKind;
  title: string;
  description?: string;
  metadata?: string;
  action?: { label: string; href: `/${string}` } | { label: string; onClick: () => void };
  duration?: number;
};

type ToastInput = string | RichToast;
type NormalizedToast = Omit<RichToast, "kind" | "duration"> & { kind: ToastKind; duration: number };
type ToastItem = NormalizedToast & { id: number; closing: boolean };
type ToastContextValue = { toast: (input: ToastInput, kind?: ToastKind) => number };

const ToastContext = createContext<ToastContextValue>({ toast: () => 0 });
const DEFAULT_DURATION = 4_500;
const EXIT_DURATION = 160;

export function normalizeToastInput(input: ToastInput, legacyKind: ToastKind = "success"): NormalizedToast {
  if (typeof input === "string") return { title: input, kind: legacyKind, duration: DEFAULT_DURATION };
  const action = input.action && "href" in input.action && (!input.action.href.startsWith("/") || input.action.href.startsWith("//"))
    ? undefined
    : input.action;
  return { ...input, action, kind: input.kind ?? "success", duration: input.duration ?? DEFAULT_DURATION };
}

export function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const statusLabel = { success: "Succès", error: "Erreur", warning: "Attention", info: "Information" }[item.kind];
  const action = item.action;
  return (
    <div className={`toast toast-${item.kind}${item.closing ? " toast-closing" : ""}`} role={item.kind === "error" ? "alert" : "status"} aria-atomic="true">
      <span aria-hidden="true" className="toast-marker" />
      <div className="toast-content">
        <span className="sr-only">{statusLabel} : </span>
        <p className="toast-title">{item.title}</p>
        {item.description ? <p className="toast-description">{item.description}</p> : null}
        {item.metadata || action ? <div className="toast-footer">
          {item.metadata ? <span className="toast-metadata">{item.metadata}</span> : <span />}
          {action ? "href" in action
            ? <a className="toast-action" href={action.href} onClick={() => onClose(item.id)}>{action.label}</a>
            : <button className="toast-action" type="button" onClick={() => { onClose(item.id); action.onClick(); }}>{action.label}</button>
          : null}
        </div> : null}
      </div>
      <button type="button" className="toast-close" aria-label={`Fermer la notification : ${item.title}`} onClick={() => onClose(item.id)}>×</button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const close = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.map((item) => item.id === id ? { ...item, closing: true } : item));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), EXIT_DURATION);
  }, []);

  useEffect(() => () => {
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
  }, []);

  const toast = useCallback((input: ToastInput, kind?: ToastKind) => {
    const id = ++nextId.current;
    const item = { ...normalizeToastInput(input, kind), id, closing: false };
    setToasts((current) => [...current, item].slice(-4));
    if (item.duration > 0) timers.current.set(id, window.setTimeout(() => close(id), item.duration));
    return id;
  }, [close]);

  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => <ToastCard key={item.id} item={item} onClose={close} />)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext);
}
