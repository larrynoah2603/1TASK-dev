import { AdminNotice, AdminPageHeader, AdminStatCard } from "@/components/admin-primitives";
import { requireAdminAccess } from "@/lib/server-auth";

export default async function AdminTechnicalPage() {
  await requireAdminAccess("TECHNICAL");
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Périmètre technique" title="Configuration technique autorisée" description="Cette rubrique est volontairement séparée de la configuration fonctionnelle. Elle ne donne pas accès aux données sensibles des tickets ni à leur historique métier." />
      <AdminNotice tone="warning">Aucune action technique ne peut modifier l’auteur, le département officiel Entra, l’affectation, le workflow ou l’historique d’un ticket.</AdminNotice>
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="Provider" value="Entra ID" detail="microsoft-entra-id uniquement" tone="success" />
        <AdminStatCard label="Accès tickets" value="Aucun implicite" detail="Les dossiers confidentiels restent cloisonnés" tone="danger" />
        <AdminStatCard label="Périmètre" value="Technique" detail="Paramètres explicitement autorisés" />
      </div>
      <section className="panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Paramètres disponibles</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Les intégrations et erreurs techniques peuvent être raccordées ici selon les permissions prévues. Aucun module d’appels, d’infrastructure ou de bureau distant n’est introduit dans le ticketing.</p>
      </section>
    </div>
  );
}
