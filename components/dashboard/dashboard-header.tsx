import { Bell, Search } from "lucide-react";

export function DashboardHeader({ firstName }: { firstName: string }) {
  return (
    <header className="dashboard-modern-header">
      <div>
        <p className="dashboard-modern-kicker">Vue d&apos;ensemble</p>
        <h1>Bonjour {firstName} <span aria-hidden="true">👋</span></h1>
        <p>Voici un aperçu de votre activité support.</p>
      </div>
      <div className="dashboard-modern-header-actions">
        <label className="dashboard-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Rechercher</span><input placeholder="Rechercher..." /></label>
        <button className="dashboard-icon-button" type="button" aria-label="Notifications"><Bell size={17} /></button>
        <span className="dashboard-avatar" aria-hidden="true">{firstName.slice(0, 1).toUpperCase()}</span>
      </div>
    </header>
  );
}
