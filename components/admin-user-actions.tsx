"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AdminManagerSearch } from "@/components/admin-manager-search";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type Status = "ACTIVE" | "DISABLED" | "PENDING_ASSIGNMENT" | "PENDING_VALIDATION";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  entraObjectId: string | null;
  entraDisplayName: string | null;
  managedDisplayName: string | null;
  status: Status;
  administrativelyDisabled: boolean;
  entraDepartmentValue: string | null;
  department: { id: string; name: string } | null;
  manager: { id: string; name: string; email: string } | null;
  entraManager: { id: string; name: string; email: string } | null;
  entraManagerObjectId: string | null;
  entraManagerDisplayName: string | null;
  entraManagerEmail: string | null;
  primaryRoleCode: string | null;
  primaryTeam: { id: string; name: string; queue: { id: string; name: string; departmentId: string } } | null;
  authorizedQueue: { id: string; name: string; departmentId: string } | null;
  jobTitle: string | null;
  roleAssignments: { role: { code: string; name: string }; scopeId: string | null }[];
};

type Options = {
  departments: { id: string; name: string; isActive: boolean }[];
  queues: { id: string; name: string; isActive: boolean; department: { id: string; name: string } }[];
  teams: { id: string; name: string; isActive: boolean; queue: { id: string; name: string; departmentId: string } }[];
  roles: { code: string; name: string }[];
};

function statusLabel(status: Status) {
  if (status === "ACTIVE") return "Actif";
  if (status === "DISABLED") return "Désactivé";
  if (status === "PENDING_VALIDATION") return "Ancienne validation à reprendre";
  return "En attente d’affectation";
}

function statusClass(status: Status) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "DISABLED") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export function AdminUserActions({
  user,
  options,
}: {
  user: AdminUser;
  options: Options;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(user.status !== "ACTIVE");
  const [history, setHistory] = useState<{
    id: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
    reason: string;
    createdAt: string;
    actor: { name: string; email: string } | null;
  }[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [departmentId, setDepartmentId] = useState(user.department?.id ?? "");
  const [managerId, setManagerId] = useState(user.manager?.id ?? "");
  const [primaryTeamId, setPrimaryTeamId] = useState(user.primaryTeam?.id ?? "");
  const [authorizedQueueId, setAuthorizedQueueId] = useState(user.authorizedQueue?.id ?? "");

  function handleDepartmentChange(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId);
    setManagerId("");
    setPrimaryTeamId("");
    setAuthorizedQueueId("");
  }

  async function loadHistory() {
    setHistoryBusy(true);
    try {
      const response = await fetch("/api/admin/users/" + user.id, { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setHistory(data.profileChanges ?? []);
      else setMessage(data.error ?? "Historique indisponible.");
    } catch {
      setMessage("L’historique n’a pas pu être chargé.");
    } finally {
      setHistoryBusy(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingForm(new FormData(event.currentTarget));
    setConfirmOpen(true);
  }

  async function saveProfile(form: FormData) {
    setBusy(true);
    setMessage("");
    const value = (key: string) => String(form.get(key) ?? "").trim();
    try {
      const response = await fetch("/api/admin/users/" + user.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managedDisplayName: value("managedDisplayName"),
          departmentId: value("departmentId") || null,
          managerId: value("managerId") || null,
          primaryRoleCode: value("primaryRoleCode") || null,
          primaryTeamId: value("primaryTeamId") || null,
          authorizedQueueId: value("authorizedQueueId") || null,
          status: value("status"),
          reason: value("reason"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Action refusée.");
        toast(data.error ?? "Action refusée.", "error");
        return;
      }
      setMessage("Profil enregistré, historisé et audité.");
      toast("Profil utilisateur enregistré et historisé.");
      router.refresh();
    } catch {
      setMessage("La modification n’a pas pu être enregistrée.");
      toast("La modification n’a pas pu être enregistrée.", "error");
    } finally {
      setBusy(false);
    }
  }

  const displayName = user.managedDisplayName ?? user.entraDisplayName ?? user.name;
  const filteredTeams = options.teams.filter(
    (item) => item.isActive && Boolean(departmentId) && item.queue.departmentId === departmentId,
  );
  const filteredQueues = options.queues.filter(
    (item) => item.isActive && Boolean(departmentId) && item.department.id === departmentId,
  );

  return (
    <article className="panel admin-user-card overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-bold text-slate-900">{displayName}</h2>
            <span className={"rounded-md px-2 py-1 text-[11px] font-semibold " + statusClass(user.status)}>
              {statusLabel(user.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md border border-slate-100 bg-slate-50/70 px-2.5 py-1.5">
              Département : <strong>{user.department?.name ?? "Non affecté"}</strong>
            </span>
            <span className="rounded-md border border-slate-100 bg-slate-50/70 px-2.5 py-1.5">
              Manager applicatif : <strong>{user.manager?.name ?? "Non affecté"}</strong>
            </span>
            <span className="rounded-md border border-slate-100 bg-slate-50/70 px-2.5 py-1.5">
              File : <strong>{user.authorizedQueue?.name ?? "Non affectée"}</strong>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="button-secondary shrink-0 min-h-9 px-3 py-2 text-xs"
        >
          {open ? "Fermer la fiche" : "Compléter / modifier"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5">
          <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 md:grid-cols-3">
            <div><p className="font-bold text-slate-800">Identité Entra ID</p><p className="mt-1 break-all">{user.entraDisplayName ?? "Non renseigné"}</p></div>
            <div><p className="font-bold text-slate-800">Identifiant unique</p><p className="mt-1 break-all">{user.entraObjectId ?? "Non renseigné"}</p></div>
            <div><p className="font-bold text-slate-800">Manager hiérarchique Entra</p><p className="mt-1">{user.entraManager?.name ?? user.entraManagerDisplayName ?? "Non renseigné"}{user.entraManager || user.entraManagerDisplayName ? " · lecture seule" : ""}</p><p className="mt-1 break-all text-[11px]">{user.entraManagerEmail ?? user.entraManagerObjectId ?? ""}</p></div>
          </div>

          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-2">
              Nom affiché dans 1TASK
              <input name="managedDisplayName" required minLength={2} defaultValue={displayName} className="field-control font-normal text-slate-900" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Département
              <Combobox name="departmentId" value={departmentId} onChange={handleDepartmentChange} options={[{ value: "", label: "Non affecté" }, ...options.departments.filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.name }))]} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Manager applicatif
              <AdminManagerSearch
                name="managerId"
                value={managerId}
                onChange={setManagerId}
                departmentId={departmentId}
                excludeId={user.id}
                currentManager={user.manager}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Rôle principal
              <Combobox name="primaryRoleCode" defaultValue={user.primaryRoleCode ?? ""} options={[{ value: "", label: "Non défini" }, ...options.roles.map((item) => ({ value: item.code, label: item.name }))]} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Équipe principale
              <Combobox name="primaryTeamId" value={primaryTeamId} onChange={setPrimaryTeamId} disabled={!departmentId} options={[{ value: "", label: departmentId ? "Non affectée" : "Sélectionnez d’abord un département" }, ...filteredTeams.map((item) => ({ value: item.id, label: `${item.name} — ${item.queue.name}` }))]} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              File autorisée
              <Combobox name="authorizedQueueId" value={authorizedQueueId} onChange={setAuthorizedQueueId} disabled={!departmentId} options={[{ value: "", label: departmentId ? "Non affectée" : "Sélectionnez d’abord un département" }, ...filteredQueues.map((item) => ({ value: item.id, label: `${item.department.name} — ${item.name}` }))]} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Statut applicatif
              <Combobox name="status" defaultValue={user.status} options={[{ value: "PENDING_ASSIGNMENT", label: "En attente d’affectation" }, { value: "PENDING_VALIDATION", label: "Ancienne validation à reprendre" }, { value: "ACTIVE", label: "Actif — valider" }, { value: "DISABLED", label: "Désactivé" }]} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-3">
              Justification obligatoire
              <input name="reason" required minLength={10} placeholder="Ex. Validation de la fiche après contrôle avec le responsable…" className="field-control font-normal text-slate-900" />
            </label>
            <button disabled={busy} className="button-primary self-end">
              {busy ? "Enregistrement…" : "Enregistrer la fiche"}
            </button>
          </form>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Les managers, équipes et files affichés sont automatiquement filtrés par département. Le changement de département réinitialise les trois attributions dépendantes.</p>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => void loadHistory()} disabled={historyBusy} className="button-secondary min-h-9 px-3 py-2 text-xs">
              {historyBusy ? "Chargement de l’historique…" : "Afficher l’historique des changements"}
            </button>
            {history?.length ? (
              <div className="mt-3 space-y-2">
                {history.map((change) => (
                  <div key={change.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">{change.field} · {new Date(change.createdAt).toLocaleString("fr-FR")}</p>
                    <p className="mt-1 break-words">{JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}</p>
                    <p className="mt-1">Motif : {change.reason} · {change.actor?.name ?? "Administrateur"}</p>
                  </div>
                ))}
              </div>
            ) : history ? <p className="mt-3 text-xs text-slate-500">Aucun changement historisé.</p> : null}
          </div>
          {message ? <p className="mt-3 text-xs font-semibold text-slate-600">{message}</p> : null}
        </div>
      ) : null}
      <ConfirmDialog open={confirmOpen} title="Confirmer la fiche utilisateur" description="Les rôles, le périmètre et le statut applicatif seront enregistrés, historisés et audités." confirmLabel="Enregistrer la fiche" busy={busy} onCancel={() => { setConfirmOpen(false); setPendingForm(null); }} onConfirm={() => { const form = pendingForm; setConfirmOpen(false); setPendingForm(null); if (form) void saveProfile(form); }} />
    </article>
  );
}
