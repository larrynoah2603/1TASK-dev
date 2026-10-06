"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { NotificationItemData } from "@/components/notifications/notifications-page";
import { ActivityIcon, formatRelativeActivityDate } from "@/components/activity-icon";


function isPriority(item: NotificationItemData) { return item.severity === "WARNING" || item.severity === "CRITICAL"; }

export function NotificationItem({ item, onRead }: { item: NotificationItemData; onRead: (id: string) => void | Promise<void> }) {
  const router = useRouter();
  const unread = item.status !== "READ";
  const priority = isPriority(item);
  const content = <><span className={`relative z-10 mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-white ${priority ? "bg-amber-50 text-amber-700" : unread ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}><ActivityIcon type={item.type} label={item.title} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{item.severity} · {item.title}</strong>{unread ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Nouveau</span> : null}{priority ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Prioritaire</span> : null}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{item.body}</span><span className="mt-2 block text-[11px] text-slate-400">{item.ticketReference ? `${item.ticketReference} • ` : ""}{formatRelativeActivityDate(item.createdAt)}</span></span>{item.ticketId ? <ChevronRight className="mt-2 size-4 shrink-0 text-slate-300" /> : null}</>;
  const classes = `relative flex w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5 ${unread ? "bg-teal-50/30" : "bg-white"}`;
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
