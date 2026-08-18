"use client";

import { FormEvent, useState } from "react";
import { Priority, RoleCode, TicketType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type Department = { id: string; code: string; name: string; isActive: boolean };
type User = {
  id: string;
  name: string;
  email: string;
  status: string;
  department: { id: string; name: string } | null;
  roleAssignments: { role: { code: RoleCode; name: string }; scopeId: string | null }[];
};
type Queue = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  department: Department;
  manager: { id: string; name: string; email: string; status: string } | null;
};
type Team = {
  id: string;
  name: string;
  isActive: boolean;
  queue: { id: string; name: string; department: Department };
  lead: { id: string; name: string; email: string; status: string } | null;
  members: { id: string; userId: string; isActive: boolean; isAvailable: boolean; skills: string[]; user: { id: string; name: string; email: string; status: string } }[];
};
type Service = {
  id: string;
  code: string;
  name: string;
  ticketType: TicketType;
  category: string;
  priorityDefault: Priority;
  queue: { id: string; name: string; department: Department };
  sla: { id: string; name: string } | null;
  isActive: boolean;
};
type Sla = { id: string; code: string; name: string; firstResponseMinutes: number; resolutionMinutes: number; calendar: { id: string; name: string; isActive: boolean }; isActive: boolean };
type Calendar = { id: string; code: string; name: string; isActive: boolean };
type EscalationRule = { id: string; name: string; thresholdPercent: number; targetRole: RoleCode; isActive: boolean; queue: { id: string; code: string; name: string } | null; serviceItem: { id: string; code: string; name: string } | null };
type EntraMapping = { id: string; externalValue: string; normalizedValue: string; isActive: boolean; department: Department };

export type AdminConfiguration = {
  departments: Department[];
  queues: Queue[];
  teams: Team[];
  users: User[];
  services: Service[];
  slas: Sla[];
  calendars: Calendar[];
  escalationRules: EscalationRule[];
  entraMappings: EntraMapping[];
  pendingUsers: { id: string; name: string; email: string; entraDepartmentValue: string | null }[];
};

export type AdminConfigurationSection = "departments" | "queues" | "teams" | "catalog" | "sla" | "roles";

const inputClass = "field-control";
const buttonClass = "button-primary min-h-10 text-xs";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field-label"><span>{label}</span>{children}</label>;
}

function value(form: HTMLFormElement, name: string): string {
  return String((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value);
}

export function AdminConfigurationPanel({ configuration, sections }: { configuration: AdminConfiguration; sections?: readonly AdminConfigurationSection[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ path: string; payload: Record<string, unknown>; form: HTMLFormElement } | null>(null);
  const enabled = (section: AdminConfigurationSection) => !sections || sections.includes(section);
  const activeUsers = configuration.users.filter((user) => user.status === "ACTIVE");
  const managerUsers = activeUsers.filter((user) => user.roleAssignments.some((assignment) => assignment.role.code === RoleCode.QUEUE_MANAGER || assignment.role.code === RoleCode.FUNCTIONAL_ADMIN));

  function submit(event: FormEvent<HTMLFormElement>, path: string, payload: Record<string, unknown>) {
    event.preventDefault();
    setPendingAction({ path, payload, form: event.currentTarget });
  }

  async function executeSubmit(path: string, payload: Record<string, unknown>, form: HTMLFormElement) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "La modification a été refusée.");
        toast(data.error ?? "La modification a été refusée.", "error");
        return;
      }
      setMessage("Modification enregistrée et auditée.");
      toast("Modification enregistrée et auditée.");
      form.reset();
      router.refresh();
    } catch {
      setMessage("La modification n’a pas pu être enregistrée.");
      toast("La modification n’a pas pu être enregistrée.", "error");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-6">
    {message ? <div role="status" className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div> : null}

    {enabled("departments") ? <section className="panel p-6">
      <h2 className="font-bold text-slate-900">Départements</h2>
      <p className="mt-1 text-xs text-slate-500">Les valeurs Entra restent administrées séparément par la correspondance dédiée.</p>
      <form onSubmit={(event) => void submit(event, "/api/admin/departments", { code: value(event.currentTarget, "code"), name: value(event.currentTarget, "name"), isActive: true, reason: value(event.currentTarget, "reason") })} className="mt-4 grid gap-3 md:grid-cols-4">
        <Field label="Code"><input name="code" required className={inputClass} placeholder="DSI" /></Field>
        <Field label="Nom"><input name="name" required className={inputClass} placeholder="Direction des systèmes" /></Field>
        <Field label="Motif"><input name="reason" required minLength={10} className={inputClass} placeholder="Motif de création…" /></Field>
        <button disabled={busy} className={buttonClass}>Ajouter</button>
      </form>
      <div className="mt-5 grid gap-2 md:grid-cols-3">{configuration.departments.map((department) => <div key={department.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold">{department.code}</span> — {department.name}<span className={department.isActive ? "ml-2 text-xs text-emerald-700" : "ml-2 text-xs text-slate-400"}>{department.isActive ? "actif" : "inactif"}</span></div>)}</div>
      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4"><p className="text-sm font-semibold text-slate-800">Référentiel des valeurs de département Microsoft Entra ID</p><p className="mt-1 text-xs leading-5 text-slate-600">Ce référentiel conserve les valeurs organisationnelles brutes. L’affectation du département d’un utilisateur et la validation de son profil se font exclusivement dans <code>/admin/users</code>.</p><form onSubmit={(event) => void submit(event, "/api/admin/entra-departments", { externalValue: value(event.currentTarget, "externalValue"), departmentId: value(event.currentTarget, "mappingDepartmentId"), isActive: true, reason: value(event.currentTarget, "mappingReason") })} className="mt-3 grid gap-3 md:grid-cols-4"><Field label="Valeur Entra"><input name="externalValue" required className={inputClass} placeholder="Direction des systèmes" /></Field><Field label="Département interne"><Combobox name="mappingDepartmentId" required options={[{ value: "", label: "Sélectionner" }, ...configuration.departments.filter((department) => department.isActive).map((department) => ({ value: department.id, label: department.name }))]} /></Field><Field label="Motif"><input name="mappingReason" required minLength={10} className={inputClass} placeholder="Motif de référentiel…" /></Field><button disabled={busy} className={buttonClass}>Enregistrer le référentiel</button></form><div className="mt-4 grid gap-2 md:grid-cols-2">{configuration.entraMappings.map((mapping) => <div key={mapping.id} className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{mapping.externalValue} → {mapping.department.name} · {mapping.isActive ? "active" : "inactive"}</div>)}</div>{configuration.pendingUsers.length ? <p className="mt-3 text-xs text-amber-700">{configuration.pendingUsers.length} compte(s) Entra attendent une affectation dans /admin/users.</p> : null}</div>
    </section> : null}

    {enabled("queues") ? <section className="panel p-6">
      <h2 className="font-bold text-slate-900">Files et responsables</h2>
      <p className="mt-1 text-xs text-slate-500">Une file appartient à un département ; son responsable est distinct du manager hiérarchique Entra ID.</p>
      <form onSubmit={(event) => void submit(event, "/api/admin/queues", { code: value(event.currentTarget, "code"), name: value(event.currentTarget, "name"), departmentId: value(event.currentTarget, "departmentId"), managerId: value(event.currentTarget, "managerId") || null, autoAssignment: (event.currentTarget.elements.namedItem("autoAssignment") as HTMLInputElement).checked, isActive: true, reason: value(event.currentTarget, "reason") })} className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Code"><input name="code" required className={inputClass} placeholder="DSI-RESEAU" /></Field>
        <Field label="Nom"><input name="name" required className={inputClass} placeholder="Support réseau" /></Field>
        <Field label="Département"><Combobox name="departmentId" required options={[{ value: "", label: "Sélectionner" }, ...configuration.departments.filter((department) => department.isActive).map((department) => ({ value: department.id, label: department.name }))]} /></Field>
        <Field label="Responsable de file"><Combobox name="managerId" options={[{ value: "", label: "Non désigné" }, ...managerUsers.map((user) => ({ value: user.id, label: `${user.name} — ${user.email}` }))]} /></Field>
        <label className="flex items-center gap-2 self-end text-xs font-semibold text-slate-600"><input type="checkbox" name="autoAssignment" /> Auto-affectation</label>
        <Field label="Motif"><input name="reason" required minLength={10} className={inputClass} placeholder="Motif de création…" /></Field>
        <button disabled={busy} className={buttonClass}>Créer la file</button>
      </form>
      <div className="mt-5 grid gap-2 md:grid-cols-2">{configuration.queues.map((queue) => <div key={queue.id} className="rounded-lg bg-slate-50 px-3 py-3 text-sm"><p className="font-semibold">{queue.name} <span className="font-normal text-slate-400">({queue.code})</span></p><p className="mt-1 text-xs text-slate-500">{queue.department.name} · Responsable : {queue.manager?.name ?? "Non désigné"} · {queue.isActive ? "active" : "inactive"}</p></div>)}</div>
    </section> : null}

    {enabled("teams") ? <section className="panel p-6">
      <h2 className="font-bold text-slate-900">Équipes et agents</h2>
      <p className="mt-1 text-xs text-slate-500">Seuls les utilisateurs actifs du département de la file peuvent rejoindre une équipe.</p>
      <form onSubmit={(event) => void submit(event, "/api/admin/teams", { name: value(event.currentTarget, "name"), queueId: value(event.currentTarget, "queueId"), leadId: value(event.currentTarget, "leadId") || null, isActive: true, reason: value(event.currentTarget, "reason") })} className="mt-4 grid gap-3 md:grid-cols-4">
        <Field label="Nom"><input name="name" required className={inputClass} placeholder="Équipe réseau" /></Field>
        <Field label="File"><Combobox name="queueId" required options={[{ value: "", label: "Sélectionner" }, ...configuration.queues.filter((queue) => queue.isActive).map((queue) => ({ value: queue.id, label: `${queue.department.name} — ${queue.name}` }))]} /></Field>
        <Field label="Responsable d’équipe"><Combobox name="leadId" options={[{ value: "", label: "Non désigné" }, ...activeUsers.map((user) => ({ value: user.id, label: user.name }))]} /></Field>
        <Field label="Motif"><input name="reason" required minLength={10} className={inputClass} placeholder="Motif de création…" /></Field>
        <button disabled={busy} className={buttonClass}>Créer l’équipe</button>
      </form>
      <form onSubmit={(event) => { const teamId = value(event.currentTarget, "teamId"); void submit(event, "/api/admin/teams/" + teamId + "/members", { userId: value(event.currentTarget, "userId"), isActive: true, isAvailable: true, skills: value(event.currentTarget, "skills").split(",").map((item) => item.trim()).filter(Boolean), reason: value(event.currentTarget, "memberReason") }); }} className="mt-5 grid gap-3 md:grid-cols-4">
        <Field label="Équipe"><Combobox name="teamId" required options={[{ value: "", label: "Sélectionner" }, ...configuration.teams.filter((team) => team.isActive).map((team) => ({ value: team.id, label: `${team.queue.name} — ${team.name}` }))]} /></Field>
        <Field label="Agent"><Combobox name="userId" required options={[{ value: "", label: "Sélectionner" }, ...activeUsers.map((user) => ({ value: user.id, label: `${user.name} — ${user.email}` }))]} /></Field>
        <Field label="Compétences"><input name="skills" className={inputClass} placeholder="wifi, réseau" /></Field>
        <Field label="Motif"><input name="memberReason" required minLength={10} className={inputClass} placeholder="Motif d’ajout…" /></Field>
        <button disabled={busy} className={buttonClass}>Ajouter l’agent</button>
      </form>
      <div className="mt-5 grid gap-2 md:grid-cols-2">{configuration.teams.map((team) => <div key={team.id} className="rounded-lg bg-slate-50 px-3 py-3 text-sm"><p className="font-semibold">{team.name} <span className="font-normal text-slate-400">· {team.queue.name}</span></p><p className="mt-1 text-xs text-slate-500">Responsable : {team.lead?.name ?? "Non désigné"} · Agents : {team.members.filter((member) => member.isActive).map((member) => member.user.name).join(", ") || "Aucun"}</p></div>)}</div>
    </section> : null}

    {enabled("catalog") ? <section className="panel p-6">
      <h2 className="font-bold text-slate-900">Catalogue de services</h2>
      <p className="mt-1 text-xs text-slate-500">Les nouveaux tickets prennent ces valeurs ; les tickets existants conservent leurs propres données et échéances.</p>
      <form onSubmit={(event) => void submit(event, "/api/admin/catalog", { code: value(event.currentTarget, "code"), name: value(event.currentTarget, "name"), description: value(event.currentTarget, "description") || null, ticketType: value(event.currentTarget, "ticketType"), category: value(event.currentTarget, "category"), keywords: value(event.currentTarget, "keywords").split(",").map((item) => item.trim()).filter(Boolean), queueId: value(event.currentTarget, "queueId"), priorityDefault: value(event.currentTarget, "priorityDefault"), slaId: value(event.currentTarget, "slaId"), isActive: true, reason: value(event.currentTarget, "reason") })} className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Code"><input name="code" required className={inputClass} placeholder="WIFI-CONNECTION" /></Field>
        <Field label="Nom"><input name="name" required className={inputClass} placeholder="Problème de connexion Wi-Fi" /></Field>
        <Field label="Description"><input name="description" className={inputClass} placeholder="Description du service" /></Field>
        <Field label="Catégorie"><input name="category" required className={inputClass} placeholder="Réseau" /></Field>
        <Field label="Nature"><Combobox name="ticketType" required options={Object.values(TicketType).map((type) => ({ value: type, label: type }))} /></Field>
        <Field label="Priorité par défaut"><Combobox name="priorityDefault" required options={Object.values(Priority).map((priority) => ({ value: priority, label: priority }))} /></Field>
        <Field label="File"><Combobox name="queueId" required options={[{ value: "", label: "Sélectionner" }, ...configuration.queues.filter((queue) => queue.isActive).map((queue) => ({ value: queue.id, label: `${queue.department.name} — ${queue.name}` }))]} /></Field>
        <Field label="SLA"><Combobox name="slaId" required options={[{ value: "", label: "Sélectionner" }, ...configuration.slas.filter((sla) => sla.isActive && sla.calendar.isActive).map((sla) => ({ value: sla.id, label: sla.name }))]} /></Field>
        <Field label="Mots-clés"><input name="keywords" className={inputClass} placeholder="wifi, connexion" /></Field>
        <Field label="Motif"><input name="reason" required minLength={10} className={inputClass} placeholder="Motif de création…" /></Field>
        <button disabled={busy} className={buttonClass}>Ajouter au catalogue</button>
      </form>
      <div className="mt-5 divide-y divide-slate-100">{configuration.services.map((service) => <div key={service.id} className="flex flex-col justify-between gap-2 py-3 md:flex-row md:items-center"><div><p className="font-semibold">{service.name} <span className="font-normal text-slate-400">({service.code})</span></p><p className="text-xs text-slate-500">{service.category} · {service.ticketType} · {service.queue.department.name} / {service.queue.name} · SLA : {service.sla?.name ?? "aucun"}</p></div><span className={service.isActive ? "text-xs text-emerald-700" : "text-xs text-slate-400"}>{service.isActive ? "actif" : "inactif"}</span></div>)}</div>
    </section> : null}

    {enabled("sla") ? <section className="panel p-6">
      <h2 className="font-bold text-slate-900">SLA, calendriers et escalades</h2>
      <p className="mt-1 text-xs text-slate-500">Les changements de catalogue s’appliquent aux nouveaux tickets sans réécrire l’historique des anciens.</p>
      <form onSubmit={(event) => void submit(event, "/api/admin/slas", { code: value(event.currentTarget, "code"), name: value(event.currentTarget, "name"), firstResponseMinutes: Number(value(event.currentTarget, "firstResponseMinutes")), resolutionMinutes: Number(value(event.currentTarget, "resolutionMinutes")), calendarId: value(event.currentTarget, "calendarId"), calculationMode: "ROLLING", alertThresholds: [50, 80, 100], isActive: true, reason: value(event.currentTarget, "reason") })} className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Code"><input name="code" required className={inputClass} placeholder="STANDARD_8H_2J" /></Field>
        <Field label="Nom"><input name="name" required className={inputClass} placeholder="SLA standard" /></Field>
        <Field label="Calendrier"><Combobox name="calendarId" required options={[{ value: "", label: "Sélectionner" }, ...configuration.calendars.filter((calendar) => calendar.isActive).map((calendar) => ({ value: calendar.id, label: calendar.name }))]} /></Field>
        <Field label="Première réponse (minutes)"><input name="firstResponseMinutes" required type="number" min="1" defaultValue="480" className={inputClass} /></Field>
        <Field label="Résolution (minutes)"><input name="resolutionMinutes" required type="number" min="1" defaultValue="960" className={inputClass} /></Field>
        <Field label="Motif"><input name="reason" required minLength={10} className={inputClass} placeholder="Motif de création…" /></Field>
        <button disabled={busy} className={buttonClass}>Créer le SLA</button>
      </form>
      <div className="mt-5 grid gap-2 md:grid-cols-2">{configuration.slas.map((sla) => <div key={sla.id} className="rounded-lg bg-slate-50 px-3 py-3 text-sm"><p className="font-semibold">{sla.name} <span className="font-normal text-slate-400">({sla.code})</span></p><p className="mt-1 text-xs text-slate-500">Réponse {sla.firstResponseMinutes} min · résolution {sla.resolutionMinutes} min · {sla.calendar.name}</p></div>)}</div>
      <form onSubmit={(event) => { const targetType = value(event.currentTarget, "targetType"); void submit(event, "/api/admin/escalations", { name: value(event.currentTarget, "ruleName"), thresholdPercent: Number(value(event.currentTarget, "thresholdPercent")), queueId: targetType === "QUEUE" ? value(event.currentTarget, "queueTarget") : null, serviceItemId: targetType === "SERVICE" ? value(event.currentTarget, "serviceTarget") : null, targetRole: value(event.currentTarget, "targetRole"), isActive: true, reason: value(event.currentTarget, "ruleReason") }); }} className="mt-5 grid gap-3 md:grid-cols-3">
        <Field label="Nom de la règle"><input name="ruleName" required className={inputClass} placeholder="Alerte SLA 80 % réseau" /></Field>
        <Field label="Seuil (%)"><input name="thresholdPercent" required type="number" min="1" max="100" defaultValue="80" className={inputClass} /></Field>
        <Field label="Rôle destinataire"><Combobox name="targetRole" required options={[RoleCode.QUEUE_MANAGER, RoleCode.AGENT, RoleCode.FUNCTIONAL_ADMIN].map((role) => ({ value: role, label: role }))} /></Field>
        <Field label="Type de cible"><Combobox name="targetType" required options={[{ value: "QUEUE", label: "File" }, { value: "SERVICE", label: "Service" }]} /></Field>
        <Field label="File cible"><Combobox name="queueTarget" options={[{ value: "", label: "Sélectionner une file" }, ...configuration.queues.filter((queue) => queue.isActive).map((queue) => ({ value: queue.id, label: `${queue.department.name} — ${queue.name}` }))]} /></Field>
        <Field label="Service cible"><Combobox name="serviceTarget" options={[{ value: "", label: "Sélectionner un service" }, ...configuration.services.filter((service) => service.isActive).map((service) => ({ value: service.id, label: service.name }))]} /></Field>
        <Field label="Motif"><input name="ruleReason" required minLength={10} className={inputClass} placeholder="Motif de création…" /></Field>
        <button disabled={busy} className={buttonClass}>Créer la règle</button>
      </form>
      <div className="mt-5 grid gap-2 md:grid-cols-2">{configuration.escalationRules.map((rule) => <div key={rule.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-sm"><p className="font-semibold">{rule.name} · {rule.thresholdPercent} %</p><p className="mt-1 text-xs text-slate-600">{rule.serviceItem ? "Service " + rule.serviceItem.name : "File " + (rule.queue?.name ?? "—")} · cible {rule.targetRole}</p></div>)}</div>
    </section> : null}

    {enabled("roles") ? <section className="panel p-6">
      <h2 className="font-bold text-slate-900">Rôles fonctionnels</h2>
      <p className="mt-1 text-xs text-slate-500">L’attribution est auditée et ne modifie jamais l’authentification Microsoft Entra ID.</p>
      <form onSubmit={(event) => { const userId = value(event.currentTarget, "userId"); void submit(event, "/api/admin/users/" + userId + "/roles", { roleCode: value(event.currentTarget, "roleCode"), reason: value(event.currentTarget, "reason") }); }} className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Utilisateur"><Combobox name="userId" required options={[{ value: "", label: "Sélectionner" }, ...activeUsers.map((user) => ({ value: user.id, label: `${user.name} — ${user.email}` }))]} /></Field>
        <Field label="Rôle"><Combobox name="roleCode" required options={Object.values(RoleCode).map((role) => ({ value: role, label: role }))} /></Field>
        <Field label="Motif"><input name="reason" required minLength={10} className={inputClass} placeholder="Motif d’attribution…" /></Field>
        <button disabled={busy} className={buttonClass}>Attribuer le rôle</button>
      </form>
    </section> : null}
    <ConfirmDialog open={Boolean(pendingAction)} title="Confirmer la modification" description="Cette modification de configuration sera enregistrée et ajoutée au journal d’audit." confirmLabel="Confirmer et enregistrer" busy={busy} onCancel={() => setPendingAction(null)} onConfirm={() => { const action = pendingAction; setPendingAction(null); if (action) void executeSubmit(action.path, action.payload, action.form); }} />
  </div>;
}
