import { NotificationList } from "@/components/notification-list";
import { listUserNotificationsPage } from "@/lib/notification-service";
import { requireAuthenticatedUser } from "@/lib/server-auth";

export default async function NotificationsPage() {
  const user = await requireAuthenticatedUser();
  const notificationPage = await listUserNotificationsPage(user, { pageSize: 25 });
  return (
    <div className="space-y-6 notification-page-shell identity-industrial notification-industrial">
      <header className="page-header"><div><p className="eyebrow">Communication</p><h1 className="mt-2">Centre de notifications</h1><p className="page-header-description mt-2">Retrouvez les alertes liées à vos tickets, à vos affectations et aux événements de votre périmètre.</p></div></header>
      <NotificationList
        initialItems={notificationPage.items.map((item) => ({ id: item.id, type: item.type, title: item.title, body: item.body, status: item.status, ticketId: item.ticketId, ticketReference: item.ticket?.reference ?? null, createdAt: item.createdAt.toISOString() }))}
        initialNextCursor={notificationPage.nextCursor}
        pageSize={notificationPage.pageSize}
      />
    </div>
  );
}
