import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ultra review safe bug regressions", () => {
  it("filters linked ticket metadata with the same visibility predicate", () => {
    const service = source("lib/ticket-service.ts");
    const start = service.indexOf("export async function listTicketLinksForViewer");
    const end = service.indexOf("export async function assignTicket", start);
    const implementation = service.slice(start, end);

    expect(implementation).toContain("counterpartAccess");
    expect(implementation).toContain("canViewTicket(subject, accessTarget(candidate))");
    expect(implementation).toContain("visibleCounterpartIds");
    expect(implementation).toContain("return links.filter");
  });

  it("scopes workflow role capabilities to the ticket being mutated", () => {
    const workflow = source("lib/ticket-workflow-service.ts");
    const start = workflow.indexOf("export async function transitionTicket");
    const implementation = workflow.slice(start);

    expect(implementation).toContain("scopedTransitionRoles");
    expect(implementation).toContain("hasScopedRole(subject, [role], transitionTarget)");
    expect(implementation).toContain('hasPermission(actor, "ticket:update", transitionTarget)');
    expect(implementation).toContain("canTransitionStatus(ticket.status, parsed.status, scopedTransitionRoles, requesterAction)");
    expect(implementation).not.toContain("const administrativeOverride = isFunctionalAdministrator(actor)");
  });

  it("does not count terminal tickets as active SLA compliance", () => {
    const reporting = source("lib/reporting-service.ts");

    expect(reporting).toContain("trackedActiveSlaWhere");
    expect(reporting).toContain("const slaComplianceRate = slaTracked");
    expect(reporting).toContain("slaTracked - overdue");
    expect(reporting).not.toContain("completionDenominator - overdue");
  });

  it("keys reporting cache by the current authorization scope", () => {
    const reporting = source("lib/reporting-service.ts");

    expect(reporting).toContain("reportingScopeFingerprint");
    expect(reporting).toContain('createHash("sha256")');
    expect(reporting).toContain("reporting:v2:");
    expect(reporting).toContain("scopeFingerprint");
  });

  it("keeps assignment and message activity from being duplicated in ticket history", () => {
    const page = source("app/(app)/tickets/[id]/page.tsx");

    expect(page).toContain("event.eventType !== TicketEventType.ASSIGNED");
    expect(page).toContain("event.eventType !== TicketEventType.MESSAGE_ADDED");
    expect(page).toContain("...ticket.assignments.map");
  });

  it("preserves read-only linked-ticket context for non operational viewers", () => {
    const page = source("app/(app)/tickets/[id]/page.tsx");

    expect(page).toContain('aria-label={operational ? "Outils avancés" : "Relations du ticket"}');
    expect(page).toContain('<TicketAdvancedPanels only="management" compact {...advancedPanelProps} />');
  });

  it("keeps ticket tabs keyboard accessible without eagerly mounting inactive content", () => {
    const tabs = source("components/tickets/detail/ticket-workspace-tabs.tsx");

    expect(tabs).toContain('event.key === "ArrowRight"');
    expect(tabs).toContain('event.key === "ArrowLeft"');
    expect(tabs).toContain('event.key === "Home"');
    expect(tabs).toContain('event.key === "End"');
    expect(tabs).toContain("tabIndex={active === tab.key ? 0 : -1}");
    expect(tabs).toContain("hidden={active !== tab.key}");
    expect(tabs).toContain("active === tab.key ? contentByTab[tab.key] : null");
  });

  it("uses the canonical topbar height for the sticky treatment rail", () => {
    const css = source("styles/design-system.css");

    expect(css).toContain("top: calc(var(--kit-topbar-h) + var(--kit-space-4));");
    expect(css).not.toContain("--kit-topbar-height");
  });
});
