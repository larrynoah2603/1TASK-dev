import { NotificationList } from "@/components/notification-list";
import { listUserNotifications } from "@/lib/notification-service";
import { requireAuthenticatedUser } from "@/lib/server-auth";

export default async function NotificationsPage() {
  const user = await requireAuthenticatedUser();
  const notifications = await listUserNotifications(user, 100);
  return (
    <div data-ui-family="personal" className="personal-page space-y-6">
      <header className="page-header"><div><p className="eyebrow">Communication</p><h1 className="mt-2">Centre de notifications</h1><p className="page-header-description mt-2">Retrouvez les alertes liées à vos tickets, à vos affectations et aux événements de votre périmètre.</p></div></header>
      <NotificationList initialItems={notifications.map((item) => ({ id: item.id, title: item.title, body: item.body, status: item.status, ticketId: item.ticketId, ticketReference: item.ticket?.reference ?? null, createdAt: item.createdAt.toISOString() }))} />
    </div>
  );
}
