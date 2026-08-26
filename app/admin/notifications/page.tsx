import { AdminNotificationRulesPanel } from "@/components/admin-notification-rules-panel";
import { AdminNotice, AdminPageHeader } from "@/components/admin-primitives";
import { getAdminConfiguration } from "@/lib/admin-service";
import { listNotificationRules, notificationRuleOptions } from "@/lib/admin-notification-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminNotificationsPage() {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const [configuration, rules] = await Promise.all([
    getAdminConfiguration(admin, ["departments", "queues"]),
    listNotificationRules(admin),
  ]);
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Communication contrôlée" title="Règles de notification" description="Définissez les événements, canaux, rôles destinataires et périmètres. Chaque changement est enregistré avec son motif et ses valeurs avant/après." />
      <AdminNotice>Les règles configurent les notifications du ticketing. Elles ne créent aucun canal de discussion ni module de chat.</AdminNotice>
      <AdminNotificationRulesPanel
        rules={rules}
        eventTypes={notificationRuleOptions.eventTypes}
        channels={notificationRuleOptions.channels}
        recipientRoles={notificationRuleOptions.recipientRoles}
        departments={configuration.departments.filter((department) => department.isActive)}
        queues={configuration.queues.filter((queue) => queue.isActive)}
      />
    </div>
  );
}
