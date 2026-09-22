"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useNotificationState } from "@/components/notification-state";
import { fetchWithTimeout } from "@/lib/client-http";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  ticketId: string | null;
  ticketReference: string | null;
  createdAt: string;
};

type NotificationResponse = {
  unreadCount: number;
  notifications: NotificationItem[];
};

function relativeDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { unreadCount, setUnreadCount } = useNotificationState();
  const ref = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef(false);

  async function loadNotifications() {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setError("");
    try {
      const response = await fetchWithTimeout("/api/notifications?take=8", { cache: "no-store" }, 8_000);
      if (!response.ok) throw new Error("Les notifications sont temporairement indisponibles.");
      const data = await response.json() as NotificationResponse;
      setItems(data.notifications ?? []);
      setUnreadCount(Number.isFinite(data.unreadCount) ? data.unreadCount : 0);
      setLoaded(true);
    } catch {
      setError("Les notifications n’ont pas pu être chargées.");
      setLoaded(true);
    } finally {
      requestInFlight.current = false;
    }
  }

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next && !loaded) void loadNotifications();
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function markRead(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (item?.status === "READ") return;
    setError("");
    try {
      const response = await fetchWithTimeout(`/api/notifications/${id}/read`, { method: "POST" }, 8_000);
      if (!response.ok) throw new Error("read-failed");
      setItems((current) => current.map((notification) => notification.id === id ? { ...notification, status: "READ" } : notification));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      setError("La notification n’a pas pu être marquée comme lue.");
    }
  }

  async function markAllRead() {
    setBusy(true);
    setError("");
    try {
      const response = await fetchWithTimeout("/api/notifications/read-all", { method: "POST" }, 8_000);
      if (!response.ok) throw new Error("read-all-failed");
      setItems((current) => current.map((item) => ({ ...item, status: "READ" })));
      setUnreadCount(0);
    } catch {
      setError("Les notifications n’ont pas pu être marquées comme lues.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="notification-anchor notification-center-industrial">
      <button type="button" onClick={toggleOpen} className="topbar-icon-button notification-trigger relative" aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lue(s)` : ""}`} aria-expanded={open} aria-haspopup="dialog" title="Notifications">
        <span aria-hidden="true" className="notification-trigger-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-7-3-9M10 21h4" /></svg></span>
        {unreadCount ? <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>
      {open ? (
        <section className="notification-popover" role="dialog" aria-label="Centre de notifications">
          <div className="notification-popover-header"><div><p className="eyebrow">Centre de notifications</p><h2 className="mt-1 text-sm font-bold text-slate-900">Vos alertes</h2></div><button type="button" disabled={busy || !unreadCount} onClick={() => void markAllRead()} className="notification-mark-all font-semibold disabled:opacity-40">Tout marquer lu</button></div>
          <div className="notification-popover-list">
            {!loaded ? <p className="px-3 py-6 text-center text-xs text-slate-500">Chargement…</p> : null}
            {error ? <p role="alert" className="px-3 py-3 text-center text-xs font-semibold text-rose-700">{error}</p> : null}
            {loaded && !error && !items.length ? <p className="px-3 py-6 text-center text-xs text-slate-500">Aucune notification.</p> : null}
            {items.map((item) => {
              const content = <><span className={`notification-dot ${item.status === "READ" ? "notification-dot-read" : ""}`} /><span className="min-w-0 flex-1"><span className="notification-item-title block font-semibold">{item.title}</span><span className="notification-item-copy mt-1 block line-clamp-2">{item.body}</span><span className="notification-item-meta mt-1 block">{item.ticketReference ? `${item.ticketReference} · ` : ""}{relativeDate(item.createdAt)}</span></span></>;
              return item.ticketId ? <Link key={item.id} href={`/tickets/${item.ticketId}`} onClick={() => { void markRead(item.id); setOpen(false); }} className={`notification-row ${item.status === "READ" ? "notification-row-read" : ""}`}>{content}</Link> : <button key={item.id} type="button" onClick={() => void markRead(item.id)} className={`notification-row w-full text-left ${item.status === "READ" ? "notification-row-read" : ""}`}>{content}</button>;
            })}
          </div>
          <Link href={"/notifications" as Route} onClick={() => setOpen(false)} className="notification-popover-footer">Ouvrir le centre complet →</Link>
        </section>
      ) : null}
    </div>
  );
}
