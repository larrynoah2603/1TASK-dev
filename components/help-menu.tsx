"use client";

import { useEffect, useRef, useState } from "react";

export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="topbar-icon-button help-trigger" aria-label="Aide" title="Aide" aria-expanded={open} aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.3a2.55 2.55 0 1 1 4.3 1.85c-.95.8-1.9 1.25-1.9 2.65" /><path d="M12 16.9h.01" /></svg></button>
      {open ? (
        <section className="popover-panel right-0 w-[min(22rem,calc(100vw-2rem))]" role="dialog" aria-label="Aide 1TASK">
          <div className="flex items-start justify-between gap-4">
            <div><p className="eyebrow">Centre d’aide</p><h2 className="mt-1 text-sm font-bold text-slate-900">Utiliser 1TASK</h2></div>
            <button type="button" onClick={() => setOpen(false)} className="text-lg leading-none text-slate-400" aria-label="Fermer l’aide">×</button>
          </div>
          <div className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
            <p><strong className="text-slate-900">Créer :</strong> choisissez un service du catalogue, décrivez votre besoin puis vérifiez l’aperçu avant l’envoi.</p>
            <p><strong className="text-slate-900">Suivre :</strong> utilisez les filtres, le SLA et l’historique du ticket pour connaître la prochaine action.</p>
            <p><strong className="text-slate-900">Besoin d’une modification :</strong> contactez l’administrateur fonctionnel de votre département.</p>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500"><strong className="text-slate-700">Raccourcis :</strong> Ctrl/⌘ + K pour rechercher · Échap pour fermer les fenêtres.</div>
        </section>
      ) : null}
    </div>
  );
}
