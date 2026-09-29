import Link from "next/link"

const tickets = [
  { id: "INC-10254", title: "Problème Wi-Fi bureau", category: "Réseau et connectivité", status: "En traitement", sla: 65, color: "warning" },
  { id: "INC-10220", title: "Demande logiciel", category: "Logiciels et licences", status: "Résolu", sla: 100, color: "success" },
  { id: "INC-10210", title: "VPN bloqué", category: "Accès distant", status: "Nouveau", sla: 20, color: "info" },
]

export const metadata = {
  title: "1TASK — Aperçu public",
  description: "Découvrez l’espace de support 1TASK sans connexion.",
}

export default function PublicPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--kit-bg)] text-slate-950">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3"><span className="text-3xl font-black tracking-[-0.08em] text-blue-600">1</span><span className="-ml-3 text-3xl font-black tracking-[-0.08em] text-slate-900">TASK</span><span className="ml-2 hidden h-8 w-px bg-slate-300 sm:block" /><span className="hidden text-sm text-slate-500 sm:block">Des équipes plus sereines,<br />un quotidien plus simple.</span></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Aperçu public</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Votre support IT, partout avec vous.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Explorez les évolutions de l’espace 1TASK sans compte. Les données affichées sont fictives et aucune action n’est enregistrée.</p>
          </div>
          <Link href="/signin" className="ui-button ui-button-primary self-start sm:self-auto">Accéder à mon espace <span aria-hidden="true">→</span></Link>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]" aria-labelledby="preview-title">
          <div className="ui-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-semibold text-slate-400">Tableau de bord</p><h2 id="preview-title" className="mt-1 text-xl font-bold">Bonjour Marie</h2><p className="mt-1 text-sm text-slate-500">Suivez vos incidents en temps réel.</p></div><span className="hidden text-xs text-slate-400 sm:block">Mercredi 24 avril 2024</span></div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {[['Tickets ouverts','3','+1 depuis la semaine dernière','info'],['Urgents','1','À traiter en priorité','danger'],['Résolus ce mois','12','+33% par rapport au mois dernier','success']].map(([label,value,caption,tone]) => <div className="rounded-xl border border-slate-200 bg-white p-4" key={label}><div className={`ui-badge ui-badge-${tone}`}>{label}</div><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{caption}</p></div>)}
            </div>
            <div className="px-5 pb-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Derniers incidents</h3><span className="text-xs font-semibold text-blue-600">Voir tous les tickets →</span></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Référence</th><th className="px-4 py-3">Sujet</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">SLA</th></tr></thead><tbody>{tickets.map((ticket) => <tr className="border-t border-slate-200" key={ticket.id}><td className="px-4 py-4 font-semibold">{ticket.id}</td><td className="px-4 py-4"><p className="font-medium">{ticket.title}</p><p className="text-xs text-slate-500">{ticket.category}</p></td><td className="px-4 py-4"><span className={`ui-badge ui-badge-${ticket.color}`}>{ticket.status}</span></td><td className="px-4 py-4"><div className="flex items-center gap-3"><span className="w-8 text-xs font-semibold">{ticket.sla}%</span><div className="ui-progress w-24"><span className={`ui-progress-fill ui-progress-${ticket.color === 'success' ? 'success' : 'brand'}`} style={{ width: `${ticket.sla}%` }} /></div></div></td></tr>)}</tbody></table></div></div>
          </div>
          <aside className="space-y-5"><div className="rounded-2xl bg-blue-600 p-5 text-white shadow-lg shadow-blue-200"><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-100">Besoin d&apos;aide ?</p><h2 className="mt-3 text-xl font-bold">Créer un incident</h2><p className="mt-2 text-sm leading-6 text-blue-100">Décrivez votre problème et notre équipe vous aidera rapidement.</p><Link href="/signin" className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-bold text-blue-700">Nouveau ticket</Link></div><div className="ui-card p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Pourquoi 1TASK</p><ul className="mt-4 space-y-4 text-sm text-slate-600"><li><strong className="block text-slate-900">Un suivi clair</strong>Chaque demande reste visible au même endroit.</li><li><strong className="block text-slate-900">Des délais maîtrisés</strong>Les indicateurs SLA donnent le bon niveau de priorité.</li><li><strong className="block text-slate-900">Une équipe accessible</strong>Les échanges et mises à jour sont centralisés.</li></ul></div></aside>
        </section>
        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:justify-between"><span>1TASK · Service Desk Interne</span><span>Démo sans données sensibles</span></footer>
      </div>
    </main>
  )
}
