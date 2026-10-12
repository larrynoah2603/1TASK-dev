import type { NotificationItemData } from "@/components/notifications/notifications-page";
import { NotificationItem } from "@/components/notifications/notification-item";

export function NotificationGroup({ label, items, onRead }: { label: string; items: NotificationItemData[]; onRead: (id: string) => void }) {
  return <section className="notification-history-group" aria-label={label}>
    <h2 className="notification-history-group-title">{label}</h2>
    <div className="notification-history-group-list">
      {items.map((item) => <NotificationItem key={item.id} item={item} onRead={onRead} />)}
    </div>
  </section>;
}
