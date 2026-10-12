"use client";

import { useMemo, useState } from "react";
import { BellOff } from "lucide-react";
import { fetchWithTimeout } from "@/lib/client-http";
import { NotificationFilter, type NotificationFilterValue } from "@/components/notifications/notification-filter";
import { NotificationGroup } from "@/components/notifications/notification-group";
import { NotificationHeader } from "@/components/notifications/notification-header";
import type { ActivityType } from "@/components/activity-icon";

export type NotificationItemData = { id: string; type: ActivityType; severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL"; entityType: string | null; actionUrl: string | null; title: string; body: string; status: string; ticketId: string | null; ticketReference: string | null; createdAt: string };
type NotificationResponse = { notifications: NotificationItemData[]; pagination?: { nextCursor?: string | null } };

function dayKey(value: string) { const date = new Date(value); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1); if (date.toDateString() === today.toDateString()) return "Aujourd’hui"; if (date.toDateString() === yesterday.toDateString()) return "Hier"; return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date); }

export function NotificationsPage({ initialItems, initialNextCursor, pageSize, pushEnabled }: { initialItems: NotificationItemData[]; initialNextCursor: string | null; pageSize: number; pushEnabled: boolean }) {
  const [items, setItems] = useState(initialItems); const [nextCursor, setNextCursor] = useState(initialNextCursor); const [filter, setFilter] = useState<NotificationFilterValue>("all"); const [busy, setBusy] = useState(false); const [refreshing, setRefreshing] = useState(false); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const unreadCount = items.filter((item) => item.status !== "READ").length;
  const visibleItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "read") return item.status === "READ";
    if (filter === "unread") return item.status !== "READ";
    if (filter === "critical") return item.severity === "CRITICAL";
    if (filter === "sla") return item.type.startsWith("SLA_");
    if (filter === "tickets") return item.entityType === "TICKET" || item.ticketId;
    if (filter === "assets") return item.entityType === "ASSET_REQUEST";
    return item.entityType?.startsWith("ADMIN") || item.type === "ADMIN_ACTION" || item.type === "SECURITY";
  });
  const groups = useMemo(() => { const result = new Map<string, NotificationItemData[]>(); for (const item of visibleItems) { const key = dayKey(item.createdAt); result.set(key, [...(result.get(key) ?? []), item]); } return [...result.entries()]; }, [visibleItems]);
  async function refresh() { setRefreshing(true); setError(""); try { const response = await fetchWithTimeout(`/api/notifications?take=${pageSize}`, { cache: "no-store" }, 8_000); if (!response.ok) throw new Error(); const data = await response.json() as NotificationResponse; setItems(data.notifications ?? []); setNextCursor(data.pagination?.nextCursor ?? null); } catch { setError("Les notifications n’ont pas pu être actualisées."); } finally { setRefreshing(false); } }
  async function markRead(id: string) { if (items.find((item) => item.id === id)?.status === "READ") return; try { const response = await fetchWithTimeout(`/api/notifications/${id}/read`, { method: "POST" }, 8_000); if (!response.ok) throw new Error(); setItems((current) => current.map((item) => item.id === id ? { ...item, status: "READ" } : item)); } catch { setError("La notification n’a pas pu être marquée comme lue."); } }
  async function markAllRead() { setBusy(true); setError(""); try { const response = await fetchWithTimeout("/api/notifications/read-all", { method: "POST" }, 8_000); if (!response.ok) throw new Error(); setItems((current) => current.map((item) => ({ ...item, status: "READ" }))); } catch { setError("Les notifications n’ont pas pu être marquées comme lues."); } finally { setBusy(false); } }
  async function loadMore() { if (!nextCursor) return; setLoadingMore(true); try { const params = new URLSearchParams({ take: String(pageSize), cursor: nextCursor }); const response = await fetchWithTimeout(`/api/notifications?${params}`, { cache: "no-store" }, 8_000); if (!response.ok) throw new Error(); const data = await response.json() as NotificationResponse; setItems((current) => { const known = new Set(current.map((item) => item.id)); return [...current, ...(data.notifications ?? []).filter((item) => !known.has(item.id))]; }); setNextCursor(data.pagination?.nextCursor ?? null); } catch { setError("Les notifications suivantes n’ont pas pu être chargées."); } finally { setLoadingMore(false); } }
  return <div className="notification-history-page mx-auto max-w-5xl space-y-5"><NotificationHeader pushEnabled={pushEnabled} unreadCount={unreadCount} loadedCount={items.length} hasMore={Boolean(nextCursor)} busy={busy} refreshing={refreshing} onMarkAllRead={() => void markAllRead()} onRefresh={() => void refresh()} /><NotificationFilter value={filter} counts={{ all: items.length, unread: unreadCount, read: items.length - unreadCount, critical: items.filter((item) => item.severity === "CRITICAL").length, sla: items.filter((item) => item.type.startsWith("SLA_")).length, tickets: items.filter((item) => item.entityType === "TICKET" || item.ticketId).length, assets: items.filter((item) => item.entityType === "ASSET_REQUEST").length, administration: items.filter((item) => item.entityType?.startsWith("ADMIN") || item.type === "ADMIN_ACTION" || item.type === "SECURITY").length }} onChange={setFilter} />
    <p className="notification-history-scope" role="status">Filtres et compteurs calculés sur les {items.length} notification{items.length === 1 ? "" : "s"} chargée{items.length === 1 ? "" : "s"}. {nextCursor ? "Chargez la suite pour étendre les résultats." : "Toutes les pages ont été chargées."}</p>
    <section className="notification-history-panel">{error ? <p role="alert" className="notification-history-error">{error}</p> : null}{groups.length ? groups.map(([label, groupItems]) => <NotificationGroup key={label} label={label} items={groupItems} onRead={(id) => void markRead(id)} />) : <div className="notification-history-empty"><div><BellOff aria-hidden="true" /><p>Aucune notification dans les éléments chargés</p><small>Ce filtre ne correspond à aucun élément chargé.{nextCursor ? " Vous pouvez charger la suite pour poursuivre la recherche." : ""}</small></div></div>}{nextCursor ? <div className="notification-history-load-more"><button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="button-secondary" aria-busy={loadingMore}>{loadingMore ? "Chargement…" : "Charger plus de notifications"}</button></div> : null}</section>
  </div>;
}
