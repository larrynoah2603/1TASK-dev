import { SearchX } from "lucide-react";
import { ClientCard } from "@/components/clients/client-card";
import type { ClientRow } from "@/components/clients/clients-page";

export function ClientsGrid({ clients, onSelect }: { clients: ClientRow[]; onSelect: (client: ClientRow) => void }) {
  if (!clients.length) {
    return (
      <section className="grid min-h-64 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <div>
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><SearchX className="size-5" /></span>
          <h2 className="mt-4 text-sm font-semibold text-slate-900">Aucun client trouvé</h2>
          <p className="mt-1 text-sm text-slate-500">Modifiez votre recherche ou le filtre sélectionné.</p>
        </div>
      </section>
    );
  }

  return <section aria-label="Liste des clients" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{clients.map((client) => <ClientCard key={client.id} client={client} onSelect={onSelect} />)}</section>;
}
