"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationItem = { id: string; title: string; body: string; status: string; ticketId: string | null; ticketReference: string | null; createdAt: string };
type NotificationResponse = { notifications: NotificationItem[] };

export function NotificationList({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const requestInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (requestInFlight.current) return;
      requestInFlight.current = true;
      try {
        const response = await fetch("/api/notifications?take=100", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as NotificationResponse;
        if (!cancelled) setItems(data.notifications ?? []);
      } catch {
        // Keep the last successful list visible when a polling request fails.
      } finally {
        requestInFlight.current = false;
      }
    };

    const loadIfVisible = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };

    const timer = window.setInterval(loadIfVisible, 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((current) => current.map((item) => item.id === id ? { ...item, status: "READ" } : item));
  }

  async function markAllRead() {
    setBusy(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((current) => current.map((item) => ({ ...item, status: "READ" })));
    setBusy(false);
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><p className="text-sm font-bold text-slate-900">Historique des notifications</p><button type="button" disabled={busy || !items.some((item) => item.status !== "READ")} onClick={() => void markAllRead()} className="button-secondary min-h-8 px-2.5 text-xs">Tout marquer lu</button></div>
      {!items.length ? <p className="px-5 py-12 text-center text-sm text-slate-500">Aucune notification à afficher.</p> : <div className="divide-y divide-slate-100">{items.map((item) => { const row = <><span className={`notification-dot ${item.status === "READ" ? "notification-dot-read" : ""}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{item.title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{item.body}</span><span className="mt-2 block text-xs text-slate-400">{item.ticketReference ? `${item.ticketReference} · ` : ""}{new Date(item.createdAt).toLocaleString("fr-FR")}</span></span><span className="text-xs font-semibold text-[#4c4dba]">{item.status === "READ" ? "Lu" : "Nouveau"}</span></>; return item.ticketId ? <Link key={item.id} href={`/tickets/${item.ticketId}`} onClick={() => { void markRead(item.id); }} className="notification-page-row">{row}</Link> : <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="notification-page-row w-full text-left">{row}</button>; })}</div>}
    </section>
  );
}
