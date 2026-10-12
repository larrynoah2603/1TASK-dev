import { UserStatus } from "@prisma/client";
import { AdminEmptyState, AdminNotice, AdminPageHeader, AdminStatCard } from "@/components/admin-primitives";
import { UsersTable } from "@/components/admin/users-table";
import { Combobox } from "@/components/combobox";
import { Pagination } from "@/components/pagination";
import { getAdminUserFormReferences, getAdminUserStatusSummary, listAdminUsersPage } from "@/lib/admin-user-query-service";
import { requireAdminAccess } from "@/lib/server-auth";

const allowedStatuses = new Set(Object.values(UserStatus));

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const raw = await searchParams;
  const q = raw.q?.trim() ?? "";
  const status = raw.status && allowedStatuses.has(raw.status as UserStatus) ? raw.status as UserStatus : undefined;
  const page = Math.max(Number(raw.page ?? "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(raw.pageSize ?? "10") || 10, 5), 50);

  const [userPage, summary, options] = await Promise.all([
    listAdminUsersPage(admin, { q, status, page, pageSize }),
    getAdminUserStatusSummary(admin),
    getAdminUserFormReferences(admin),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Identités et habilitations" title="Fiches utilisateurs 1TASK" description="L’administrateur fonctionnel valide le nom affiché, le département, le manager applicatif, le rôle, l’équipe et la file autorisée. Les identifiants Microsoft Entra ID restent en lecture seule." />
      <AdminNotice tone="warning">Une nouvelle identité Entra reste en attente jusqu’à sa validation. Le nom Entra, l’adresse e-mail et l’identifiant unique ne sont jamais modifiables ici.</AdminNotice>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Actifs" value={summary.active} detail="Accès à l’espace normal autorisé" tone="success" />
        <AdminStatCard label="À affecter" value={summary.pending} detail="Profil à compléter par l’administrateur" tone="warning" />
        <AdminStatCard label="Désactivés" value={summary.disabled} detail="Accès applicatif bloqué" tone="danger" />
      </div>

      <form method="get" className="filter-panel grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <label className="field-label"><span>Rechercher un utilisateur</span><input type="search" name="q" defaultValue={raw.q} className="field-control" placeholder="Nom, e-mail, département…" /></label>
        <label className="field-label"><span>Statut</span><Combobox name="status" defaultValue={status ?? ""} options={[{ value: "", label: "Tous" }, { value: "ACTIVE", label: "Actifs" }, { value: "PENDING_ASSIGNMENT", label: "À affecter" }, { value: "PENDING_VALIDATION", label: "À valider" }, { value: "DISABLED", label: "Désactivés" }]} /></label>
        <label className="field-label"><span>Par page</span><Combobox name="pageSize" defaultValue={String(userPage.pageSize)} options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }]} /></label>
        <div className="flex items-end gap-2"><button className="button-primary">Rechercher</button><a href="/admin/users" className="button-ghost min-h-10 text-xs">Réinitialiser</a></div>
      </form>

      {!userPage.total ? (
        <AdminEmptyState title={q || status ? "Aucun utilisateur correspondant" : "Aucun utilisateur synchronisé"} description={q || status ? "Modifiez la recherche ou le filtre de statut." : "Les utilisateurs apparaîtront après leur connexion Microsoft Entra ID autorisée."} />
      ) : (
        <div className="space-y-3">
          <UsersTable users={userPage.users} options={options} />
          <Pagination basePath="/admin/users" query={{ q: raw.q, status: status ?? "", pageSize: String(userPage.pageSize) }} page={userPage.page} totalPages={userPage.totalPages} total={userPage.total} pageSize={userPage.pageSize} />
        </div>
      )}
    </div>
  );
}
