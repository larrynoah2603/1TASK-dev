"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { NotificationItemData } from "@/components/notifications/notifications-page";
import { ActivityIcon, formatRelativeActivityDate } from "@/components/activity-icon";

const severityLabels: Record<string, string> = {
  INFO: "Information", SUCCESS: "Succès", WARNING: "Attention", CRITICAL: "Critique",
};

function isPriority(item: NotificationItemData) {
  return item.severity === "WARNING" || item.severity === "CRITICAL";
}

export function NotificationItem({ item, onRead }: { item: NotificationItemData; onRead: (id: string) => void | Promise<void> }) {
  const router = useRouter();
  const unread = item.status !== "READ";
  const priority = isPriority(item);
  const content = <>
    <span className="notification-history-item-icon">
      <ActivityIcon type={item.type} label={item.title} />
    </span>
    <span className="notification-history-item-body">
      <span className="notification-history-item-heading">
        <strong>{severityLabels[item.severity] ?? item.severity} · {item.title}</strong>
        {unread ? <span className="notification-history-chip is-unread">Non lue</span> : null}
        {priority ? <span className="notification-history-chip is-priority">Prioritaire</span> : null}
      </span>
      <span className="notification-history-item-description">{item.body}</span>
      <span className="notification-history-item-date">
        {item.ticketReference ? `${item.ticketReference} · ` : ""}
        {formatRelativeActivityDate(item.createdAt)}
      </span>
    </span>
    {item.ticketId ? <ChevronRight aria-hidden="true" className="notification-history-item-arrow" /> : null}
  </>;
  const classes = `notification-history-item${unread ? " is-unread" : ""}${priority ? " is-priority" : ""}`;
  const actionUrl = item.actionUrl ?? (item.ticketId ? `/tickets/${item.ticketId}` : null);
  return actionUrl ? <Link
    href={actionUrl as Route}
    onClick={(event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      void (async () => {
        await onRead(item.id);
        router.push(actionUrl as Route);
      })();
    }}
    className={classes}
  >{content}</Link> : <button type="button" onClick={() => void onRead(item.id)} className={classes}>{content}</button>;
}
