import { AdminEmptyState, AdminNotice, AdminPageHeader, AdminStatCard } from "@/components/admin-primitives";
import { AdminUserActions } from "@/components/admin-user-actions";
import { Combobox } from "@/components/combobox";
import { Pagination } from "@/components/pagination";
import { getAdminConfiguration } from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdminAccess("FUNCTIONAL");
  const raw = await searchParams;
  const configuration = await getAdminConfiguration(admin, ["users"]);
  const active = configuration.users.filter((user) => user.status === "ACTIVE").length;
  const pending = configuration.users.filter(
    (user) => user.status === "PENDING_ASSIGNMENT" || user.status === "PENDING_VALIDATION",
  ).length;
  const disabled = configuration.users.filter((user) => user.status === "DISABLED").length;

  const options = {
    departments: configuration.departments.map(({ id, name, isActive }) => ({ id, name, isActive })),
    queues: configuration.queues.map((queue) => ({
      id: queue.id,
      name: queue.name,
      isActive: queue.isActive,
      department: { id: queue.department.id, name: queue.department.name },
    })),
    teams: configuration.teams.map((team) => ({
      id: team.id,
      name: team.name,
      isActive: team.isActive,
      queue: { id: team.queue.id, name: team.queue.name, departmentId: team.queue.departmentId },
    })),
    roles: configuration.roles.map((role) => ({ code: role.code, name: role.name })),
    managers: configuration.users.map((user) => ({
      id: user.id,
      name: user.managedDisplayName ?? user.entraDisplayName ?? user.name,
      email: user.email,
      status: user.status,
      departmentId: user.department?.id ?? null,
    })),
  };
  const query = raw.q?.trim().toLowerCase() ?? "";
  const statusFilter = raw.status ?? "";
  const page = Math.max(Number(raw.page ?? "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(raw.pageSize ?? "10") || 10, 5), 50);
  const filteredUsers = configuration.users.filter((user) => {
    const searchable = [user.name, user.email, user.entraDisplayName, user.department?.name, user.manager?.name].filter(Boolean).join(" ").toLowerCase();
    return (!query || searchable.includes(query)) && (!statusFilter || user.status === statusFilter);
  });
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Identités et habilitations"
        title="Fiches utilisateurs 1TASK"
        description="L’administrateur fonctionnel valide le nom affiché, le département, le manager applicatif, le rôle, l’équipe et la file autorisée. Les identifiants Microsoft Entra ID restent en lecture seule."
      />
      <AdminNotice tone="warning">
        Une nouvelle identité Entra reste en attente jusqu’à sa validation. Le nom Entra,
        l’adresse e-mail et l’identifiant unique ne sont jamais modifiables ici.
      </AdminNotice>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Actifs" value={active} detail="Accès à l’espace normal autorisé" tone="emerald" />
        <AdminStatCard label="À affecter" value={pending} detail="Profil à compléter par l’administrateur" tone="amber" />
        <AdminStatCard label="Désactivés" value={disabled} detail="Accès applicatif bloqué" tone="rose" />
      </div>

      <form method="get" className="filter-panel grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><label className="field-label"><span>Rechercher un utilisateur</span><input name="q" defaultValue={raw.q} className="field-control" placeholder="Nom, e-mail, département…" /></label><label className="field-label"><span>Statut</span><Combobox name="status" defaultValue={statusFilter} options={[{ value: "", label: "Tous" }, { value: "ACTIVE", label: "Actifs" }, { value: "PENDING_ASSIGNMENT", label: "À affecter" }, { value: "PENDING_VALIDATION", label: "À valider" }, { value: "DISABLED", label: "Désactivés" }]} /></label><label className="field-label"><span>Par page</span><Combobox name="pageSize" defaultValue={String(pageSize)} options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }]} /></label><div className="flex items-end gap-2"><button className="button-primary">Rechercher</button><a href="/admin/users" className="button-ghost min-h-10 text-xs">Réinitialiser</a></div></form>

      {!configuration.users.length ? (
        <AdminEmptyState
          title="Aucun utilisateur synchronisé"
          description="Les utilisateurs apparaîtront après leur connexion Microsoft Entra ID autorisée."
        />
      ) : (
        <div className="space-y-3">
          {visibleUsers.map((user) => (
            <AdminUserActions key={user.id} user={user} options={options} />
          ))}
          {!visibleUsers.length ? <AdminEmptyState title="Aucun utilisateur correspondant" description="Modifiez la recherche ou le filtre de statut." /> : null}
          <Pagination basePath="/admin/users" query={{ q: raw.q, status: statusFilter, pageSize: String(pageSize) }} page={page} totalPages={totalPages} total={filteredUsers.length} pageSize={pageSize} />
        </div>
      )}
    </div>
  );
}
