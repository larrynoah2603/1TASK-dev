import { NewTicketForm } from "@/components/new-ticket-form";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/server-auth";

export default async function NewTicketPage() {
  try {
    await requirePermission("ticket:create");
  } catch {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-7">
      <div className="surface-grid overflow-hidden rounded-xl border border-[#dfe1f9] bg-white px-5 py-6 sm:px-8 md:py-8">
        <p className="eyebrow">Catalogue de services · 1TASK</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Créer une demande</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Décrivez votre besoin en quelques étapes. Votre identité vient de Microsoft Entra ID et votre département est celui de votre profil applicatif validé ; le catalogue s’occupe du routage vers la bonne équipe.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-md bg-[#f0f0ff] px-3 py-1.5 text-[#4c4dba]">01 · Choisir un service</span>
          <span className="rounded-md bg-slate-100 px-3 py-1.5">02 · Décrire le besoin</span>
          <span className="rounded-md bg-slate-100 px-3 py-1.5">03 · Suivre le SLA</span>
        </div>
      </div>
      <NewTicketForm />
    </div>
  );
}
