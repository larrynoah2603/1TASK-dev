import { NotificationsPage } from "@/components/notifications/notifications-page";
import { listUserNotificationsPage } from "@/lib/notification-service";
import { requireAuthenticatedUser } from "@/lib/server-auth";

export default async function NotificationHistoryPage() {
  const user = await requireAuthenticatedUser();
  const page = await listUserNotificationsPage(user, { pageSize: 25 });
  return <div className="notification-industrial"><NotificationsPage initialItems={page.items.map((item) => ({ id: item.id, type: item.type, severity: item.severity, entityType: item.entityType, actionUrl: item.actionUrl, title: item.title, body: item.body, status: item.status, ticketId: item.ticketId, ticketReference: item.ticket?.reference ?? null, createdAt: item.createdAt.toISOString() }))} initialNextCursor={page.nextCursor} pageSize={page.pageSize} /></div>;
}
