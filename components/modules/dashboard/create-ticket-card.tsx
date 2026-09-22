import Link from "next/link";

export function CreateTicketCard() {
  return <section className="dashboard-create-callout" aria-labelledby="create-incident-title"><div className="dashboard-create-icon" aria-hidden="true">+</div><div><p className="eyebrow">Besoin d&apos;aide ?</p><h2 id="create-incident-title">Un problème à signaler ?</h2><p>Décrivez votre besoin en quelques étapes. Notre équipe vous orientera automatiquement vers le bon service.</p></div><Link href="/tickets/new" className="button-primary">Nouveau ticket <span aria-hidden="true">→</span></Link></section>;
}
