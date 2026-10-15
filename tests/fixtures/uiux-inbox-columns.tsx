/* Isolated visual fixture. Real components, synthetic data, no production route. */
import { createRoot } from "react-dom/client";
import { Priority, TicketStatus } from "@prisma/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AgentTicketTable } from "@/components/inbox/agent-ticket-table";
import { ToastProvider } from "@/components/toast-provider";

const tickets = [
  { id: "fixture-1", reference: "TCK-20261014-A1B2C3D4", title: "Accès au dossier partagé de l’équipe", priority: Priority.HIGH, status: TicketStatus.NEW },
  { id: "fixture-2", reference: "TCK-20261014-E5F60718", title: "Configuration du poste de travail", priority: Priority.MEDIUM, status: TicketStatus.IN_PROGRESS },
  { id: "fixture-3", reference: "TCK-20261014-92A3B4C5", title: "Équipement indisponible dans la salle de réunion — rétablir la connexion du vidéoprojecteur, vérifier le câble réseau et préparer le poste de présentation avant la prochaine réunion de l’équipe de support", priority: Priority.CRITICAL, status: TicketStatus.BLOCKED },
].map((ticket) => ({ ...ticket, updatedAt: new Date("2026-10-14T10:00:00Z"), requester: { name: "Utilisateur fictif" }, assignedTo: null,
  queue: { name: "Support de test", department: { name: "Département fictif" } }, serviceCatalogItem: null,
  slaState: "NONE" as const, slaDueAt: null }));

// Navigation is deliberately outside this component-only test; no auth or API bypass.
const noNavigation = () => { throw new Error("Navigation outside isolated visual fixture"); };
const router = { bfcacheId: "uiux-fixture", back: noNavigation, forward: noNavigation, push: noNavigation, replace: noNavigation,
  refresh: noNavigation, prefetch: async () => {}, hmrRefresh: noNavigation };

function Fixture() {
  return <AppRouterContext.Provider value={router}><ToastProvider>
    <div className="shell-industrial kit-app">
      <main className="kit-main" style={{ margin: "0 auto", padding: 16, maxWidth: "none", width: "100%" }}>
        <p className="eyebrow">Aperçu de la liste · Données fictives · Profil BIOS</p>
        <h1>Tickets à traiter</h1>
        <div className="inbox-v2" style={{ marginTop: 16 }}>
          <section className="inbox-workbench" aria-label="Tickets fictifs">
            <AgentTicketTable tickets={tickets} claimableTicketIds={["fixture-1"]} />
          </section>
        </div>
      </main>
    </div>
  </ToastProvider></AppRouterContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
