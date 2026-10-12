"use client";

import Link from "next/link";
import { useState } from "react";
import { fetchWithTimeout } from "@/lib/client-http";
import { ActivityIcon, formatRelativeActivityDate, type ActivityType } from "@/components/activity-icon";

type NotificationItem = { id: string; type: ActivityType; title: string; body: string; status: string; ticketId: string | null; ticketReference: string | null; createdAt: string };
type NotificationResponse = { notifications: NotificationItem[]; pagination?: { nextCursor?: string | null; hasMore?: boolean } };

export function NotificationList({ initialItems, initialNextCursor, pageSize }: { initialItems: NotificationItem[]; initialNextCursor: string | null; pageSize: number }) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function refreshNotifications() {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetchWithTimeout(`/api/notifications?take=${pageSize}`, { cache: "no-store" }, 8_000);
      if (!response.ok) throw new Error("refresh-failed");
      const data = await response.json() as NotificationResponse;
      setItems(data.notifications ?? []);
      setNextCursor(data.pagination?.nextCursor ?? null);
    } catch {
      setError("Les notifications n’ont pas pu être actualisées.");
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({ take: String(pageSize), cursor: nextCursor });
      const response = await fetchWithTimeout(`/api/notifications?${params}`, { cache: "no-store" }, 8_000);
      if (!response.ok) throw new Error("load-more-failed");
      const data = await response.json() as NotificationResponse;
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...(data.notifications ?? []).filter((item) => !known.has(item.id))];
      });
      setNextCursor(data.pagination?.nextCursor ?? null);
    } catch {
      setError("Les notifications suivantes n’ont pas pu être chargées.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function markRead(id: string) {
    if (items.find((item) => item.id === id)?.status === "READ") return;
    setError("");
    try {
      const response = await fetchWithTimeout(`/api/notifications/${id}/read`, { method: "POST" }, 8_000);
      if (!response.ok) throw new Error("read-failed");
      setItems((current) => current.map((item) => item.id === id ? { ...item, status: "READ" } : item));
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
    } catch {
      setError("Les notifications n’ont pas pu être marquées comme lues.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="notification-history panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--kit-border)] px-5 py-4"><p className="text-sm font-bold text-[var(--kit-text)]">Historique des notifications</p><div className="flex items-center gap-2"><button type="button" disabled={refreshing} onClick={() => void refreshNotifications()} className="button-secondary min-h-8 px-2.5 text-xs">{refreshing ? "Actualisation…" : "Actualiser"}</button><button type="button" disabled={busy || !items.some((item) => item.status !== "READ")} onClick={() => void markAllRead()} className="button-secondary min-h-8 px-2.5 text-xs">Tout marquer lu</button></div></div>
      {error ? <p role="alert" className="border-b border-[var(--kit-danger)] bg-[var(--kit-danger-soft)] px-5 py-3 text-sm font-semibold text-[var(--kit-danger-text)]">{error}</p> : null}
      {!items.length ? <p className="px-5 py-12 text-center text-sm text-[var(--kit-text-2)]">Aucune notification à afficher.</p> : <div className="divide-y divide-[var(--kit-border)]">{items.map((item) => { const row = <><span className="notification-activity-icon"><ActivityIcon type={item.type} label={item.title} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--kit-text)]">{item.title}</span><span className="mt-1 block text-sm leading-6 text-[var(--kit-text-2)]">{item.body}</span><span className="mt-2 block text-xs text-[var(--kit-text-2)]">{item.ticketReference ? `${item.ticketReference} • ` : ""}{formatRelativeActivityDate(item.createdAt)}</span></span><span className="notification-row-state text-xs font-semibold">{item.status === "READ" ? "Lu" : "Nouveau"}</span></>; return item.ticketId ? <Link key={item.id} href={`/tickets/${item.ticketId}`} onClick={() => { void markRead(item.id); }} className="notification-page-row">{row}</Link> : <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="notification-page-row w-full text-left">{row}</button>; })}</div>}
      {nextCursor ? <div className="border-t border-[var(--kit-border)] p-4 text-center"><button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="button-secondary">{loadingMore ? "Chargement…" : "Charger plus de notifications"}</button></div> : null}
    </section>
  );
}
