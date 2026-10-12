import { PushNotificationButton } from "@/components/push-notification-button";
import { BellRing, CheckCheck, RefreshCw } from "lucide-react";

export function NotificationHeader({
  unreadCount, loadedCount, hasMore, busy, refreshing, pushEnabled, onMarkAllRead, onRefresh,
}: {
  unreadCount: number;
  loadedCount: number;
  hasMore: boolean;
  busy: boolean;
  refreshing: boolean;
  pushEnabled: boolean;
  onMarkAllRead: () => void;
  onRefresh: () => void;
}) {
  return <header className="notification-history-header">
    <div className="notification-history-heading">
      <span className="notification-history-symbol"><BellRing aria-hidden="true" /></span>
      <div>
        <p className="eyebrow">Communication</p>
        <h1>Notifications</h1>
        <p className="notification-history-description">
          {unreadCount} non lue{unreadCount === 1 ? "" : "s"} sur {loadedCount} notification{loadedCount === 1 ? "" : "s"} chargée{loadedCount === 1 ? "" : "s"}{hasMore ? " · d’autres sont disponibles" : ""}.
        </p>
      </div>
    </div>
    <div className="notification-history-actions">
      {pushEnabled ? <PushNotificationButton /> : null}
      <button type="button" disabled={refreshing} onClick={onRefresh} className="button-secondary">
        <RefreshCw aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
        {refreshing ? "Actualisation…" : "Actualiser"}
      </button>
      <button type="button" disabled={busy || unreadCount === 0} onClick={onMarkAllRead} className="button-primary">
        <CheckCheck aria-hidden="true" /> Tout marquer lu
      </button>
    </div>
  </header>;
}
