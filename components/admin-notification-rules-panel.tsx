"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type Rule = {
  id: string;
  name: string;
  eventType: string;
  channel: string;
  recipientRole: string;
  isActive: boolean;
  department: { id: string; name: string } | null;
  queue: { id: string; name: string } | null;
};

type Option = { id: string; name: string };
type PendingAction = { path: string; method: "POST" | "PATCH"; payload: Record<string, unknown>; form?: HTMLFormElement; title: string; description: string };

export function AdminNotificationRulesPanel({
  rules,
  eventTypes,
  channels,
  recipientRoles,
  departments,
  queues,
}: {
  rules: Rule[];
  eventTypes: string[];
  channels: string[];
  recipientRoles: string[];
  departments: Option[];
  queues: (Option & { department: { name: string } })[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  function value(form: HTMLFormElement, name: string) {
    return String((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPendingAction({
      path: "/api/admin/notifications",
      method: "POST",
      form,
      title: "Confirmer la création de la règle",
      description: "Cette règle modifiera les notifications envoyées aux utilisateurs et sera ajoutée au journal d’audit.",
      payload: {
        name: value(form, "name"),
        eventType: value(form, "eventType"),
        channel: value(form, "channel"),
        recipientRole: value(form, "recipientRole"),
        departmentId: value(form, "departmentId") || null,
        queueId: value(form, "queueId") || null,
        isActive: true,
        reason: value(form, "reason"),
      },
    });
  }

  async function execute(action: PendingAction) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(action.path, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "La règle a été refusée.");
        toast(data.error ?? "La règle a été refusée.", "error");
        return;
      }
      const created = action.path === "/api/admin/notifications";
      setMessage(created ? "Règle créée et auditée." : "Règle mise à jour et auditée.");
      toast(created ? "Règle créée et auditée." : "Règle mise à jour et auditée.");
      action.form?.reset();
      router.refresh();
    } catch {
      setMessage("La règle n’a pas pu être enregistrée.");
      toast("La règle n’a pas pu être enregistrée.", "error");
    } finally {
      setBusy(false);
    }
  }

  function toggle(rule: Rule) {
    const reason = window.prompt("Justification de cette modification (10 caractères minimum) :");
    if (!reason || reason.trim().length < 10) return;
    setPendingAction({
      path: `/api/admin/notifications/${rule.id}`,
      method: "PATCH",
      title: rule.isActive ? "Confirmer la désactivation" : "Confirmer l’activation",
      description: "L’état de cette règle de notification sera modifié et l’opération sera ajoutée au journal d’audit.",
      payload: {
        name: rule.name,
        eventType: rule.eventType,
        channel: rule.channel,
        recipientRole: rule.recipientRole,
        departmentId: rule.department?.id ?? null,
        queueId: rule.queue?.id ?? null,
        isActive: !rule.isActive,
        reason,
      },
    });
  }

  return (
    <div className="space-y-5">
      {message ? <div role="status" className="admin-notice">{message}</div> : null}
      <form onSubmit={submit} className="grid gap-3 rounded-xl kit-callout p-5 md:grid-cols-3">
        <label className="field-label">Nom<input name="name" required className="field-control" placeholder="Alerte SLA au responsable" /></label>
        <label className="field-label">Événement<Combobox name="eventType" required options={eventTypes.map((item) => ({ value: item, label: item }))} /></label>
        <label className="field-label">Canal<Combobox name="channel" required options={channels.map((item) => ({ value: item, label: item }))} /></label>
        <label className="field-label">Rôle destinataire<Combobox name="recipientRole" required options={recipientRoles.map((item) => ({ value: item, label: item }))} /></label>
        <label className="field-label">Département<Combobox name="departmentId" options={[{ value: "", label: "Tous" }, ...departments.map((item) => ({ value: item.id, label: item.name }))]} /></label>
        <label className="field-label">File<Combobox name="queueId" options={[{ value: "", label: "Toutes" }, ...queues.map((item) => ({ value: item.id, label: `${item.department.name} — ${item.name}` }))]} /></label>
        <label className="field-label md:col-span-2">Motif<input name="reason" required minLength={10} className="field-control" placeholder="Motif de création de la règle…" /></label>
        <button disabled={busy} aria-busy={busy} className="button-primary self-end">{busy ? "Création…" : "Créer la règle"}</button>
      </form>

      {!rules.length ? <div className="rounded-xl border border-dashed border-[var(--kit-border-strong)] bg-[var(--kit-card)] px-6 py-10 text-center text-sm text-[var(--kit-text-2)]">Aucune règle de notification n’est configurée.</div> : (
        <div className="table-shell overflow-x-auto" role="region" aria-label="Règles de notification, tableau défilant" tabIndex={0}>
          <table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Règles de notification, déclencheur, destinataire, périmètre, état et action</caption>
            <thead className="border-b border-[var(--kit-border)] text-xs uppercase tracking-[0.12em]"><tr><th className="px-4 py-3.5">Règle</th><th className="px-4 py-3.5">Déclencheur</th><th className="px-4 py-3.5">Destinataire</th><th className="px-4 py-3.5">Périmètre</th><th className="px-4 py-3.5">État</th><th className="px-4 py-3.5">Action</th></tr></thead>
            <tbody className="divide-y divide-[var(--kit-border)]">{rules.map((rule) => <tr key={rule.id}><td className="px-4 py-3.5 font-semibold text-[var(--kit-text)]">{rule.name}<p className="text-xs font-normal text-[var(--kit-text-2)]">{rule.channel}</p></td><td className="px-4 py-3.5 text-[var(--kit-text-2)]">{rule.eventType}</td><td className="px-4 py-3.5 text-[var(--kit-text-2)]">{rule.recipientRole}</td><td className="px-4 py-3.5 text-[var(--kit-text-2)]">{rule.department?.name ?? "Tous les départements"}{rule.queue ? ` · ${rule.queue.name}` : ""}</td><td className="px-4 py-3.5"><span className={rule.isActive ? "rounded-md bg-[var(--kit-success-soft)] px-2 py-1 text-xs font-semibold text-[var(--kit-success-text)]" : "rounded-md bg-[var(--kit-neutral-soft)] px-2 py-1 text-xs font-semibold text-[var(--kit-text-2)]"}>{rule.isActive ? "Active" : "Inactive"}</span></td><td className="px-4 py-3.5"><button disabled={busy} onClick={() => void toggle(rule)} className="text-xs font-semibold operational-link hover:underline">{rule.isActive ? "Désactiver" : "Activer"}</button></td></tr>)}</tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.title ?? "Confirmer l’action"} description={pendingAction?.description ?? ""} confirmLabel="Confirmer et enregistrer" busy={busy} onCancel={() => setPendingAction(null)} onConfirm={() => { const action = pendingAction; setPendingAction(null); if (action) void execute(action); }} />
    </div>
  );
}
