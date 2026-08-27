import { AdminNotice } from "@/components/admin-primitives";
import { requireAuthenticatedUser, roleCodes } from "@/lib/server-auth";
import { ROLE_LABELS } from "@/lib/identity";

export default async function ProfilePage() {
  const user = await requireAuthenticatedUser();
  const roles = roleCodes(user);

  return (
    <div className="mx-auto max-w-4xl space-y-6 profile-page-shell identity-industrial profile-industrial">
      <header className="page-header flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#f0f0ff] text-lg font-bold text-[#4c4dba]">{user.image ? <img src={user.image} alt="Photo de profil" className="h-full w-full object-cover" /> : user.name.slice(0, 1).toUpperCase()}</div>
        <div><p className="eyebrow">Identité applicative</p><h1 className="mt-2">Mon profil 1TASK</h1><p className="page-header-description mt-2">Ces informations sont affichées en lecture seule. Toute modification doit être demandée à l’administrateur fonctionnel.</p></div>
      </header>
      <AdminNotice>Microsoft Entra ID reste la source de l’identité et de l’adresse e-mail. Le profil affiché dans 1TASK est géré par l’administration fonctionnelle.</AdminNotice>
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Informations du profil</p></div>
        <dl className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2">
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Nom affiché</dt><dd className="mt-1.5 text-base font-semibold text-slate-900">{user.name}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Adresse e-mail</dt><dd className="mt-1.5 text-sm font-medium text-slate-700">{user.email}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Département</dt><dd className="mt-1.5 text-sm font-medium text-slate-700">{user.department?.name ?? "Non affecté"}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Manager applicatif</dt><dd className="mt-1.5 text-sm font-medium text-slate-700">{user.manager?.name ?? "Non affecté"}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Équipe principale</dt><dd className="mt-1.5 text-sm font-medium text-slate-700">{user.primaryTeam?.name ?? "Non affectée"}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">File autorisée</dt><dd className="mt-1.5 text-sm font-medium text-slate-700">{user.authorizedQueue?.name ?? "Non affectée"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Rôles</dt><dd className="mt-2 flex flex-wrap gap-2">{roles.map((role) => <span key={role} className="rounded-md bg-[#f0f0ff] px-2.5 py-1.5 text-xs font-semibold text-[#4c4dba]">{ROLE_LABELS[role]}</span>)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
