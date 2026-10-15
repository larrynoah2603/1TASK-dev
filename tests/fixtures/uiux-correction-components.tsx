/* Isolated visual fixture. Real components, synthetic data, no production route. */
import { createRoot } from "react-dom/client";
import { Priority, TicketStatus } from "@prisma/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AgentTicketTable } from "@/components/inbox/agent-ticket-table";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { DashboardViewTabs } from "@/components/dashboard-visuals";
import { TicketStepper } from "@/components/tickets/ticket-stepper";
import { TicketSummary } from "@/components/tickets/ticket-summary";
import { ToastProvider } from "@/components/toast-provider";

const tickets = [
  { id: "fixture-1", reference: "TEST-2026-001", title: "Accès au dossier partagé de l’équipe", priority: Priority.HIGH, status: TicketStatus.NEW },
  { id: "fixture-2", reference: "TEST-2026-002", title: "Configuration du poste de travail", priority: Priority.MEDIUM, status: TicketStatus.IN_PROGRESS },
  { id: "fixture-3", reference: "TEST-2026-003", title: "Équipement indisponible — référence exceptionnellement longue à contrôler", priority: Priority.CRITICAL, status: TicketStatus.BLOCKED },
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
      <main id="main-content" className="kit-main" style={{ margin: "0 auto", maxWidth: 1360 }}>
        <p className="eyebrow">Recette de composants · Données fictives · Aucune session métier</p>
        <div className="agent-workspace inbox-operations-industrial">
          <header className="page-header"><div><h1>Boîte agent — contrôle visuel</h1><p>Composants du projet, thèmes BIOS et interactions locales.</p></div></header>
          <DashboardViewTabs active="operations" canOperate canReport />
          <section className="inbox-workbench" aria-label="Tickets fictifs">
            <AgentTicketTable tickets={tickets} claimableTicketIds={["fixture-1"]} />
          </section>
          <section className="kit-card" style={{ padding: 22 }} aria-label="Variantes indépendantes">
            <h2>Priorité identique dans chaque contexte</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 12 }}>
              {Object.values(Priority).map(priority => <div key={priority} data-priority={priority}>
                <p>{priority}</p>
                <div data-case="alone"><PriorityBadge priority={priority} /></div>
                <div data-case="before"><PriorityBadge priority={priority} /><StatusBadge status={TicketStatus.NEW} /></div>
                <div data-case="after"><StatusBadge status={TicketStatus.NEW} /><PriorityBadge priority={priority} /></div>
                <table><tbody><tr><td data-case="cell"><PriorityBadge priority={priority} /></td><td><StatusBadge status={TicketStatus.NEW} /></td></tr></tbody></table>
              </div>)}
            </div>
          </section>
          <section className="ticket-create-industrial" aria-label="Composants de création">
            <div className="ticket-wizard-intro"><div><p className="eyebrow">Formulaire · composants isolés</p><h2>Créer un ticket</h2><p>Contrôle des textes, étapes et surfaces.</p></div><TicketStepper /></div>
            <div style={{ marginTop: 18 }}><TicketSummary /></div>
          </section>
        </div>
      </main>
    </div>
  </ToastProvider></AppRouterContext.Provider>;
}

createRoot(document.getElementById("root")!).render(<Fixture />);
