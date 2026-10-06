"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationState } from "@/components/notification-state";
import { useDismissable } from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icons";
import { ActivityIcon, formatRelativeActivityDate, type ActivityType } from "@/components/activity-icon";
import { fetchWithTimeout } from "@/lib/client-http";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  ticketId: string | null;
  ticketReference: string | null;
  createdAt: string;
  type: ActivityType;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  actionUrl: string | null;
};

type NotificationResponse = { notifications: NotificationItem[] };

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { unreadCount, setUnreadCount } = useNotificationState();
  const closePanel = useCallback(() => setOpen(false), []);
  const ref = useDismissable<HTMLDivElement>(open, closePanel);
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

  async function markRead(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (item?.status === "READ") return true;
    setError("");
    try {
      const response = await fetchWithTimeout(`/api/notifications/${id}/read`, { method: "POST" }, 8_000);
      if (!response.ok) throw new Error("read-failed");
      setItems((current) => current.map((notification) => notification.id === id ? { ...notification, status: "READ" } : notification));
      setUnreadCount((current) => Math.max(0, current - 1));
      return true;
    } catch {
      setError("La notification n’a pas pu être marquée comme lue.");
      return false;
    }
  }

  async function openNotification(id: string, actionUrl: string) {
    setOpen(false);
    await markRead(id);
    router.push(actionUrl as Route);
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

  const unread = items.filter((item) => item.status !== "READ").length;
  const groups = [
    { label: "Aujourd’hui", entries: items.filter((item) => isToday(item.createdAt)) },
    { label: "Plus tôt", entries: items.filter((item) => !isToday(item.createdAt)) },
  ].filter((group) => group.entries.length);

  function renderRow(item: NotificationItem) {
    const read = item.status === "READ";
    const className = `kit-notif-row ${read ? "kit-notif-read" : "kit-notif-unread"}`;
    const content = (
      <>
        <span className="kit-notif-icon"><ActivityIcon type={item.type} label={item.title} /></span>
        <span className="kit-notif-body">
          <span className="kit-notif-item-title">{item.severity} · {item.title}</span>
          <span className="kit-notif-item-copy">{item.body}</span>
          <span className="kit-notif-item-meta notification-item-meta">{item.ticketReference ? `${item.ticketReference} • ` : ""}{formatRelativeActivityDate(item.createdAt)}</span>
        </span>
        {read ? null : <span className="kit-notif-dot" role="img" aria-label="Non lue" />}
      </>
    );
    const actionUrl = item.actionUrl ?? (item.ticketId ? `/tickets/${item.ticketId}` : null);
    return actionUrl
      ? <Link
          key={item.id}
          href={actionUrl as Route}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            void openNotification(item.id, actionUrl);
          }}
          className={className}
        >{content}</Link>
      : <button key={item.id} type="button" onClick={() => void markRead(item.id)} className={className}>{content}</button>;
  }

  return (
    <div ref={ref} className="kit-anchor">
      <button type="button" onClick={toggleOpen} className="kit-icon-btn" aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lue(s)` : ""}`} aria-expanded={open} aria-haspopup="dialog" title="Notifications">
        <Icon name="bell" />
        {unreadCount ? <span className="kit-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>
      {open ? (
        <section className="kit-popover kit-notif" role="dialog" aria-label="Centre de notifications">
          <div className="kit-notif-head">
            <h2 className="kit-notif-title">Notifications{unread ? <span className="kit-badge kit-badge-info">{unread} nouvelle{unread > 1 ? "s" : ""}</span> : null}</h2>
            <button type="button" disabled={busy || !unreadCount} onClick={() => void markAllRead()} className="kit-btn kit-btn-ghost kit-btn-sm notification-mark-all">Tout marquer lu</button>
          </div>
          <div className="kit-notif-list">
            {!loaded ? <p className="kit-notif-empty">Chargement…</p> : null}
            {error ? <p role="alert" className="kit-notif-error">{error}</p> : null}
            {loaded && !error && !items.length ? <p className="kit-notif-empty">Aucune notification.</p> : null}
            {groups.map((group) => (
              <div key={group.label}>
                <p className="kit-notif-group">{group.label}</p>
                {group.entries.map(renderRow)}
              </div>
            ))}
          </div>
          <Link href={"/notifications" as Route} onClick={() => setOpen(false)} className="kit-notif-foot">Voir toutes les notifications</Link>
        </section>
      ) : null}
    </div>
  );
}
