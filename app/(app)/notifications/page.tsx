import { NotificationsPage as NotificationsWorkspace } from "@/components/notifications/notifications-page";
import { listUserNotificationsPage } from "@/lib/notification-service";
import { requireAuthenticatedUser } from "@/lib/server-auth";

export default async function NotificationsPage() {
  const user = await requireAuthenticatedUser();
  const notificationPage = await listUserNotificationsPage(user, { pageSize: 25 });
  return <NotificationsWorkspace initialItems={notificationPage.items.map((item) => ({ id: item.id, title: item.title, body: item.body, status: item.status, ticketId: item.ticketId, ticketReference: item.ticket?.reference ?? null, createdAt: item.createdAt.toISOString() }))} initialNextCursor={notificationPage.nextCursor} pageSize={notificationPage.pageSize} />;
}
