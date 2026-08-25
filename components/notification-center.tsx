"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
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

export function NotificationCenter({ initialUnreadCount = 0 }: { initialUnreadCount?: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const ref = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (requestInFlight.current) return;
      requestInFlight.current = true;
      try {
        const response = await fetchWithTimeout("/api/notifications?take=8", { cache: "no-store" }, 8_000);
        if (!response.ok) return;
        const data = await response.json() as NotificationResponse;
        if (cancelled) return;
        setItems(data.notifications ?? []);
        setUnreadCount(Number.isFinite(data.unreadCount) ? data.unreadCount : 0);
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      } finally {
        requestInFlight.current = false;
      }
    };

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, []);

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
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((current) => current.map((notification) => notification.id === id ? { ...notification, status: "READ" } : notification));
    if (item?.status !== "READ") setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    setBusy(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((current) => current.map((item) => ({ ...item, status: "READ" })));
    setUnreadCount(0);
    setBusy(false);
  }

  return (
    <div ref={ref} className="notification-anchor">
      <button type="button" onClick={() => setOpen((value) => !value)} className="topbar-icon-button notification-trigger relative" aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lue(s)` : ""}`} aria-expanded={open} aria-haspopup="dialog" title="Notifications">
        <span aria-hidden="true" className="notification-trigger-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-7-3-9M10 21h4" /></svg></span>
        {unreadCount ? <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>
      {open ? (
        <section className="notification-popover" role="dialog" aria-label="Centre de notifications">
          <div className="notification-popover-header"><div><p className="eyebrow">Centre de notifications</p><h2 className="mt-1 text-sm font-bold text-slate-900">Vos alertes</h2></div><button type="button" disabled={busy || !unreadCount} onClick={() => void markAllRead()} className="text-[11px] font-semibold text-[#4c4dba] disabled:opacity-40">Tout marquer lu</button></div>
          <div className="notification-popover-list">
            {!loaded ? <p className="px-3 py-6 text-center text-xs text-slate-500">Chargement…</p> : null}
            {loaded && !items.length ? <p className="px-3 py-6 text-center text-xs text-slate-500">Aucune notification.</p> : null}
            {items.map((item) => {
              const content = <><span className={`notification-dot ${item.status === "READ" ? "notification-dot-read" : ""}`} /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{item.title}</span><span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-slate-500">{item.body}</span><span className="mt-1 block text-[10px] text-slate-400">{item.ticketReference ? `${item.ticketReference} · ` : ""}{relativeDate(item.createdAt)}</span></span></>;
              return item.ticketId ? <Link key={item.id} href={`/tickets/${item.ticketId}`} onClick={() => { void markRead(item.id); setOpen(false); }} className={`notification-row ${item.status === "READ" ? "notification-row-read" : ""}`}>{content}</Link> : <button key={item.id} type="button" onClick={() => void markRead(item.id)} className={`notification-row w-full text-left ${item.status === "READ" ? "notification-row-read" : ""}`}>{content}</button>;
            })}
          </div>
          <Link href={"/notifications" as Route} onClick={() => setOpen(false)} className="notification-popover-footer">Ouvrir le centre complet →</Link>
        </section>
      ) : null}
    </div>
  );
}
