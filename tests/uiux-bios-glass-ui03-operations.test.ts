import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("styles/bios-glass-v31-shell-v1.css");
const ui03 = css.slice(css.indexOf("/* UI-03 — Layouts driven by the actual content region"));
const kanban = read("components/inbox/agent-ticket-kanban.tsx");

describe("UI-03 — responsive du Dashboard, de l'Inbox et du détail ticket", () => {
  it("garde les nouvelles règles isolées sous le profil BIOS et laisse l'ancienne V1 en place", () => {
    expect(ui03.length).toBeGreaterThan(1000);
    const tree = postcss.parse(ui03, { from: "styles/bios-glass-v31-shell-v1.css" });
    let count = 0;
    tree.walkRules((rule) => {
      count++;
      expect(rule.selector.trim(), rule.selector).toMatch(/^html\[data-visual-profile="bios-glass-v31"\]/);
    });
    expect(count).toBeGreaterThan(15);
    expect(ui03).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(ui03).not.toContain("!important");
  });

  it("dimensionne le Kanban sur la largeur du workbench et non le viewport", () => {
    expect(ui03).toContain("container-name: agent-workbench;");
    expect(ui03).toContain("container-type: inline-size;");
    expect(ui03).toContain("@container agent-workbench (max-width: 1249px)");
    expect(ui03).toContain("@container agent-workbench (min-width: 1250px)");
    expect(ui03).toContain("grid-auto-columns: clamp(228px, 30cqi, 280px)");
    expect(ui03).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(ui03).toContain("scroll-snap-type: x proximity");
    expect(ui03).not.toContain("@media (max-width: 1199px)");
  });

  it("rend le défilement Kanban découvrable et utilisable au clavier", () => {
    expect(kanban).toContain('className="agent-kanban" role="region" tabIndex={0}');
    expect(kanban).toContain("agent-kanban-scroll-hint");
    expect(kanban).toContain("Défilez horizontalement");
    expect(ui03).toContain(".agent-kanban-scroll-hint");
    expect(kanban).toContain("data-kanban-dropzone={column.id}");
    expect(kanban).toContain("draggable={false}");
    expect(kanban).not.toContain("onDrop");
    expect(kanban).not.toContain("onDragStart");
  });

  it("conserve les cinq colonnes V1 et les liens directs vers les tickets", () => {
    const mapping = read("lib/ticket-kanban.ts");
    for (const lane of ['"qualification"', '"assignment"', '"in-progress"', '"blocked"', '"confirmation"']) {
      expect(mapping).toContain(lane);
    }
    expect(kanban).toContain("TICKET_KANBAN_COLUMNS.map");
    expect(kanban).toContain("getTicketKanbanColumnId(ticket.status)");
    expect(kanban).toContain('href={`/tickets/${ticket.id}` as Route}');
  });

  it("garde le résumé Dashboard compact avec les quatre nombres et sans CTA dupliqué", () => {
    const kpi = read("components/dashboard/kpi-grid.tsx");
    const dashboard = read("components/dashboard/dashboard-page.tsx");
    expect(kpi).toContain('key: "open"');
    expect(kpi).toContain('key: "inProgress"');
    expect(kpi).toContain('key: "resolved"');
    expect(kpi).toContain('key: "atRisk"');
    expect(kpi).toContain("{values[key]}");
    expect(dashboard).toContain("<KpiGrid values={kpis} />");
    expect(ui03).toContain("container: bios-dashboard / inline-size");
    expect(ui03).toContain("@container bios-dashboard (min-width: 760px)");
    expect(ui03).toContain("@container bios-dashboard (max-width: 899px)");
    expect(ui03).toContain("min-height: 92px");
    expect(ui03).toContain("font-variant-numeric: tabular-nums");
    expect(dashboard).not.toContain("NewTicketLauncher");
  });

  it("empêche le rail de traitement d'écraser la conversation sur écran compact", () => {
    const ticket = read("app/(app)/tickets/[id]/page.tsx");
    expect(ui03).toContain("container: bios-ticket-detail / inline-size");
    expect(ui03).toContain("@container bios-ticket-detail (max-width: 1019px)");
    expect(ui03).toContain("@container bios-ticket-detail (min-width: 1020px)");
    expect(ui03).toContain("grid-template-columns: minmax(0, 1fr) minmax(290px, 340px)");
    expect(ui03).toContain("position: static");
    expect(ui03).toContain("position: sticky");
    expect(ui03).toContain("order: -1");
    expect(ticket).toContain("<TicketSidebarActions>");
    expect(ticket).toContain("<TicketActions");
    expect(ticket).toContain("getTicketForViewer(user, ticketId)");
  });

  it("préserve un seul filtre Inbox, le Claim et le détail inline du ticket", () => {
    const workbench = read("components/inbox/inbox-workbench.tsx");
    const table = read("components/inbox/agent-ticket-table.tsx");
    const inbox = read("app/(app)/inbox/page.tsx");
    expect(workbench).toContain('useState<InboxLayout>("list")');
    expect(workbench.match(/className="inbox-filter-form"/g)).toHaveLength(1);
    expect(workbench).toContain("<AgentTicketTable");
    expect(workbench).toContain("<AgentTicketKanban");
    expect(table).toContain("colSpan={7}");
    expect(table).toContain("aria-expanded");
    expect(table).toContain("<ClaimTicketButton");
    expect(inbox).toContain("<InboxSlaWatch user={user} />");
    expect(inbox).toContain("<TicketCursorPagination");
  });

  it("préserve les protections d'accessibilité et de thèmes", () => {
    expect(ui03).toContain("--kit-text");
    expect(ui03).toContain("--kit-font-mono");
    expect(ui03).toContain("@media (prefers-reduced-motion: reduce)");
    const palette = read("styles/bios-glass-v31-preview.css");
    expect(palette).toContain('html[data-visual-profile="bios-glass-v31"][data-theme="dark"]');
    expect(read("components/app-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
    expect(read("components/admin-shell.tsx").match(/<NewTicketLauncher\b/g)).toHaveLength(1);
  });
});
