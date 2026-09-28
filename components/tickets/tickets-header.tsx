export function TicketsHeader({ count }: { count: number }) {
  return <header className="tickets-modern-header"><div><p className="eyebrow">Service Desk</p><h1>Tickets</h1><p>Suivez, priorisez et résolvez vos demandes depuis un espace unique.</p></div><div className="tickets-header-count"><strong>{count}</strong><span>tickets affichés</span></div></header>;
}
