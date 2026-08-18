"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toast: () => undefined,
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1_000);
    setToasts((current) => [...current, { id, message, kind }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4_500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.kind}`} role={item.kind === "error" ? "alert" : "status"}>
            <span aria-hidden="true" className="toast-dot" />
            <span>{item.message}</span>
            <button type="button" aria-label="Fermer la notification" onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
