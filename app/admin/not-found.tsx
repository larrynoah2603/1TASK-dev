import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="panel p-10 text-center">
      <p className="eyebrow">Administration</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-600">Cette rubrique d’administration n’existe pas ou n’est plus disponible.</p>
      <Link href="/admin" className="button-primary mt-5">Retour au tableau de bord</Link>
    </div>
  );
}
