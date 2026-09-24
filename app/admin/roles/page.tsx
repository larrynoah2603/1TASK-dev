import { RoleCode } from "@prisma/client";
import { AdminNotice, AdminPageHeader } from "@/components/admin-primitives";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSION_CODES } from "@/lib/identity";
import { requireAdminAccess } from "@/lib/server-auth";

const matrix = [
  { resource: "Ticket", read: ["ticket:read"], create: ["ticket:create"], update: ["ticket:update"] },
  { resource: "Client", read: ["ticket:read"], create: [], update: [] },
  { resource: "Administration", read: ["organization:manage"], create: [], update: ["organization:manage"] },
] as const;

export default async function AdminRolesPage() {
  await requireAdminAccess("FUNCTIONAL");
  const roles = Object.values(RoleCode);
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Habilitations" title="Rôles et permissions" description="Consultez les capacités attribuées à chaque rôle métier. Les règles d’accès restent évaluées côté serveur." />
      <AdminNotice>Cette matrice est une vue de gouvernance. Elle ne remplace jamais les contrôles backend, les permissions explicites ou les périmètres de file.</AdminNotice>
      <section className="admin-role-grid" aria-label="Rôles applicatifs">
        {roles.map((role) => <article className="admin-role-card" key={role}><p className="eyebrow">Rôle métier</p><h2>{ROLE_LABELS[role]}</h2><p>{ROLE_DESCRIPTIONS[role]}</p><div className="admin-role-permissions">{ROLE_PERMISSION_CODES[role].slice(0, 8).map((permission) => <span key={permission}>✓ {permission}</span>)}</div><small>{ROLE_PERMISSION_CODES[role].length} permissions effectives</small></article>)}
      </section>
      <section className="panel p-5 sm:p-6"><div className="mb-4"><p className="eyebrow">Matrice de lecture</p><h2 className="text-lg font-semibold">Capacités principales</h2></div><PermissionMatrix rows={matrix.map((row) => ({ resource: row.resource, read: row.read.length > 0, create: row.create.length > 0, update: row.update.length > 0 }))} /></section>
    </div>
  );
}
