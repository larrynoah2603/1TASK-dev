import type { NotificationItemData } from "@/components/notifications/notifications-page";
import { NotificationItem } from "@/components/notifications/notification-item";

export function NotificationGroup({ label, items, onRead }: { label: string; items: NotificationItemData[]; onRead: (id: string) => void }) {
  return <section aria-labelledby={`notification-group-${label}`}><h2 id={`notification-group-${label}`} className="border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</h2><div className="relative divide-y divide-slate-100 before:absolute before:bottom-4 before:left-[2.05rem] before:top-4 before:w-px before:bg-slate-200 sm:before:left-[2.55rem]">{items.map((item) => <NotificationItem key={item.id} item={item} onRead={onRead} />)}</div></section>;
}
