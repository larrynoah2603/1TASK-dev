import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BlockReason, Priority, RoleCode, ScopeType, TicketStatus, TicketType } from "@prisma/client";
import { canClaimTicket, canReadReporting, canViewTicket } from "@/lib/access-control";
import { canAssignTicket, canConfirmResolution, canPostInternalMessage, canReopenResolution, canTransitionStatus, allowedNextStatuses } from "@/lib/domain";
import { isSupportedAuthProvider } from "@/lib/auth-policy";
import { routeTicketFromCatalog } from "@/lib/routing";
import { getTicketSlaState } from "@/lib/sla";
import {
  addMessageSchema,
  assignmentSchema,
  createTicketSchema,
  transitionTicketSchema,
} from "@/lib/validation";

const projectRoot = process.cwd();

function source(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

function section(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) throw new Error(`Section introuvable : ${start}`);
  const endIndex = text.indexOf(end, startIndex + start.length);
  if (endIndex < 0) return text.slice(startIndex);
  return text.slice(startIndex, endIndex);
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const textSourceExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".jsx",
  ".json",
  ".mjs",
  ".ts",
  ".tsx",
]);

function walkTextSources(directory: string): string[] {
  return walk(directory).filter((path) => textSourceExtensions.has(extname(path).toLowerCase()));
}

const ticketService = source("lib/ticket-service.ts");
const ticketAssignmentService = source("lib/ticket-assignment-service.ts");
const ticketWorkflowService = source("lib/ticket-workflow-service.ts");
const productionService = source("lib/production-service.ts");
const notificationCenter = source("components/notification-center.tsx");
const ticketSchema = source("prisma/schema.prisma");
const authSource = source("lib/auth.ts");
const entraSource = source("lib/entra.ts");
const unassignedTicket = {
  requesterId: "crequester00000000000000001",
  assignedToId: null,
  queueId: "cqueue-network000000000000001",
  departmentId: "cdepartment-dsi00000000000001",
  confidential: false,
  teamIds: ["cteam-network000000000000001"],
};

const serviceCandidates = [
  {
    id: "cservicewifi0000000000000001",
    code: "WIFI-CONNECTION",
    name: "Problème de connexion Wi-Fi",
    ticketType: TicketType.INCIDENT,
    category: "Réseau",
    queueId: "cqueue-network000000000000001",
    priorityDefault: Priority.HIGH,
    keywords: ["wifi", "connexion"],
  },
  {
    id: "cservicehardware00000000000001",
    code: "MATERIAL-FAILURE",
    name: "Panne de matériel",
    ticketType: TicketType.INCIDENT,
    category: "Matériel",
    queueId: "cqueue-hardware00000000000001",
    priorityDefault: Priority.MEDIUM,
    keywords: ["ordinateur", "panne"],
  },
];

describe("Prompt 8 — création, catalogue et département Entra", () => {
  it("valide la création d’un ticket depuis un service du catalogue", () => {
    const result = createTicketSchema.safeParse({
      serviceCatalogItemId: serviceCandidates[0].id,
      title: "Connexion Wi-Fi indisponible",
      description: "La connexion Wi-Fi ne fonctionne plus dans le bureau.",
      confidential: false,
    });

    expect(result.success).toBe(true);
    expect(ticketService).toContain("if (parsed.serviceCatalogItemId)");
    expect(ticketService).toContain("matchCatalogService");
    expect(ticketService).toContain("TRIAGE-${targetDepartment?.code}");
    expect(ticketService).toContain("sourceDepartmentId: actor.departmentId");
  });

  it("protège la création contre les retries avec un token idempotent", () => {
    const result = createTicketSchema.safeParse({
      creationIdempotencyToken: "web-1234567890abcdef",
      serviceCatalogItemId: serviceCandidates[0].id,
      title: "Connexion Wi-Fi indisponible",
      description: "La connexion Wi-Fi ne fonctionne plus dans le bureau.",
    });

    expect(result.success).toBe(true);
    expect(ticketService).toContain("creationIdempotencyToken: parsed.creationIdempotencyToken ?? null");
    expect(ticketService).toContain("isTicketCreationIdempotencyConflict");
    expect(ticketService).toContain("createdById: actor.id");
  });

  it("route automatiquement la nature, la catégorie, la file et la priorité", () => {
    const decision = routeTicketFromCatalog({
      serviceCatalogItemId: serviceCandidates[0].id,
      candidates: serviceCandidates,
    });

    expect(decision).toMatchObject({
      serviceCatalogItemId: serviceCandidates[0].id,
      queueId: serviceCandidates[0].queueId,
      type: TicketType.INCIDENT,
      category: "Réseau",
      priority: Priority.HIGH,
    });
  });

  it("limite les Worklogs au traitement autorisé du ticket", () => {
    const worklogSection = section(productionService, "export async function addWorklog", "export async function listMissionWorklogs");
    expect(worklogSection).toContain("isAssignedAgent");
    expect(worklogSection).toContain("canManageTicketQueue");
    expect(worklogSection).toContain("Un worklog ne peut être imputé");
  });

  it("ne réintroduit pas de polling périodique global des notifications", () => {
    expect(notificationCenter).not.toContain("setInterval");
    expect(notificationCenter).toContain("fetchWithTimeout");
  });

  it("aligne les notifications de file sur la visibilité opérationnelle", () => {
    const notificationService = source("lib/ticket-notification-service.ts");
    expect(notificationService).toContain("administrativelyDisabled: false");
    expect(notificationService).toContain("authorizedQueueId: queueId");
    expect(notificationService).toContain("RoleCode.QUEUE_MANAGER");
  });

  it("reprend le département et le manager depuis le profil Microsoft Entra", () => {
    expect(entraSource).toContain("profile.department");
    expect(entraSource).toContain("entraDepartmentValue");
    expect(entraSource).toContain("entraDisplayName");
    expect(entraSource).toContain("departmentId: existingUser?.departmentId ?? null");
    expect(entraSource).toContain("profile.manager?.id");
    expect(entraSource).toContain("entraManagerObjectId");
    expect(entraSource).not.toContain("departmentId: department?.id ?? null");
    expect(ticketService).toContain("ensureActorDepartment(actor)");
  });

  it("interdit au client de modifier le département, la file, l’agent, le SLA ou la priorité", () => {
    const result = createTicketSchema.safeParse({
      serviceCatalogItemId: serviceCandidates[0].id,
      title: "Demande de support",
      description: "Une description suffisamment précise pour le traitement.",
      departmentId: "cdepartmentforced000000000001",
      queueId: "cqueueforced000000000001",
      assignedToId: "cagentforced00000000001",
      managerId: "cmanagerforced000000000001",
      slaId: "cslaforced000000000000001",
      priority: Priority.CRITICAL,
    });

    expect(result.success).toBe(false);
    const create = section(ticketService, "export async function createTicket", "export async function findCreatedTicketByToken");
    expect(create).not.toContain("parsed.departmentId");
    expect(create).not.toContain("parsed.queueId");
    expect(create).not.toContain("parsed.assignedToId");
  });

  it("permet le routage vers le département propre ou vers un département cible autorisé par le catalogue", () => {
    const ownDepartment = routeTicketFromCatalog({
      serviceCatalogItemId: serviceCandidates[0].id,
      candidates: serviceCandidates,
    });
    const otherDepartment = routeTicketFromCatalog({
      serviceCatalogItemId: serviceCandidates[1].id,
      candidates: serviceCandidates,
    });

    expect(ownDepartment.queueId).toBe(serviceCandidates[0].queueId);
    expect(otherDepartment.queueId).toBe(serviceCandidates[1].queueId);
    expect(ticketService).toContain("routedDepartmentId: service.queue.departmentId");
  });
});

describe("Prompt 8 — Claim, affectation et réorientation", () => {
  const unassignedTicket = {
    requesterId: "crequester00000000000000001",
    assignedToId: null,
    queueId: "cqueue-network000000000000001",
    departmentId: "cdepartment-dsi00000000000001",
    confidential: false,
    teamIds: ["cteam-network000000000000001"],
  };

  const agent = {
    id: "cagent000000000000000001",
    teamIds: ["cteam-network000000000000001"],
    roles: [{ code: RoleCode.AGENT, scope: { type: ScopeType.TEAM, teamId: "cteam-network000000000000001" } }],
  };

  it("autorise la prise en charge d’un ticket non affecté par un agent de sa file", () => {
    expect(canClaimTicket(agent, unassignedTicket)).toBe(true);
  });

  it("refuse la prise en charge d’un agent hors file ou hors équipe", () => {
    expect(canClaimTicket({ ...agent, teamIds: ["cteam-other000000000000001"] }, unassignedTicket)).toBe(false);
    expect(canClaimTicket({ id: "cmanager000000000000001", roles: [{ code: RoleCode.QUEUE_MANAGER }] }, unassignedTicket)).toBe(false);
  });

  it("effectue le Claim dans une transaction avec une condition anti-concurrence", () => {
    const claim = section(ticketService, "export async function claimTicket", "export async function transitionTicket");
    expect(claim).toContain("prisma.$transaction");
    expect(claim).toContain("freshActor");
    expect(claim).toContain("freshTicket");
    expect(claim).toContain("tryAcquireTicketClaim");
    expect(ticketAssignmentService).toContain("assignedToId: null");
    expect(ticketAssignmentService).toContain("ticket.updateMany");
    expect(claim).toContain("Ce ticket vient d’être pris par un autre agent.");
  });

  it("réserve l’affectation au responsable de file et vérifie l’agent actif membre de la file", () => {
    expect(canAssignTicket([RoleCode.QUEUE_MANAGER])).toBe(true);
    expect(canAssignTicket([RoleCode.AGENT])).toBe(false);

    const assignment = section(ticketService, "export async function assignTicket", "export async function claimTicket");
    expect(assignment).toContain("status: \"ACTIVE\"");
    expect(assignment).toContain("role: { code: RoleCode.AGENT }");
    expect(assignment).toContain("team: { queueId: ticket.queueId, isActive: true }");
    expect(assignment).toContain("tx.ticket.updateMany");
  });

  it("réaffecte ou réoriente sans réinitialiser les échéances SLA", () => {
    const transfer = section(ticketService, "export async function transferTicket", "export async function grantConfidentialAccess");
    expect(transfer).toContain("tx.ticketAssignment.create");
    expect(transfer).toContain("TICKET_QUEUE_TRANSFERRED");
    expect(transfer).toContain("slaPreserved: true");
    expect(transfer).not.toContain("slaId:");
    expect(transfer).not.toContain("resolutionDueAt:");
    expect(ticketSchema).toContain("firstResponseDueAt");
    expect(ticketSchema).toContain("resolutionDueAt");
  });
});

describe("Prompt 8 — transitions, commentaires et SLA", () => {
  it("applique les transitions autorisées et refuse les sauts illégaux", () => {
    expect(allowedNextStatuses(TicketStatus.NEW, [RoleCode.AGENT])).toEqual([
      TicketStatus.TO_QUALIFY,
      TicketStatus.TO_ASSIGN,
      TicketStatus.CANCELLED,
    ]);
    expect(canTransitionStatus(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, [RoleCode.AGENT])).toBe(true);
    expect(canTransitionStatus(TicketStatus.NEW, TicketStatus.RESOLUTION_PENDING, [RoleCode.FUNCTIONAL_ADMIN])).toBe(false);
    expect(canTransitionStatus(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED, [RoleCode.AGENT])).toBe(false);
  });

  it("exige un motif pour bloquer et permet la reprise d’un ticket bloqué", () => {
    expect(transitionTicketSchema.safeParse({ status: TicketStatus.BLOCKED }).success).toBe(false);
    expect(transitionTicketSchema.safeParse({
      status: TicketStatus.BLOCKED,
      blockReason: BlockReason.MISSING_INFORMATION,
      blockDetails: "Une information du demandeur est attendue.",
    }).success).toBe(true);
    expect(canTransitionStatus(TicketStatus.BLOCKED, TicketStatus.IN_PROGRESS, [RoleCode.AGENT])).toBe(true);
  });

  it("exige cause, action et solution pour soumettre une résolution", () => {
    expect(transitionTicketSchema.safeParse({ status: TicketStatus.RESOLUTION_PENDING }).success).toBe(false);
    expect(transitionTicketSchema.safeParse({
      status: TicketStatus.RESOLUTION_PENDING,
      resolutionCause: "Configuration incorrecte",
      resolutionAction: "Paramètres corrigés",
      resolutionSolution: "Service vérifié avec le demandeur",
    }).success).toBe(true);
  });

  it("réserve la confirmation et la réouverture au demandeur autorisé ou à l’administrateur fonctionnel", () => {
    expect(canConfirmResolution([RoleCode.REQUESTER], true)).toBe(true);
    expect(canConfirmResolution([RoleCode.AGENT], false)).toBe(false);
    expect(canReopenResolution([RoleCode.REQUESTER], true)).toBe(true);
    expect(transitionTicketSchema.safeParse({ status: TicketStatus.REOPENED }).success).toBe(false);
    expect(transitionTicketSchema.safeParse({
      status: TicketStatus.REOPENED,
      reopenedReason: "La résolution doit être reprise.",
    }).success).toBe(true);
  });

  it("sépare les commentaires publics et internes selon le rôle", () => {
    expect(addMessageSchema.safeParse({ body: "Message visible par le demandeur.", visibility: "REQUESTER" }).success).toBe(true);
    expect(addMessageSchema.safeParse({ body: "Note de traitement interne.", visibility: "INTERNAL" }).success).toBe(true);
    expect(canPostInternalMessage([RoleCode.AGENT])).toBe(true);
    expect(canPostInternalMessage([RoleCode.REQUESTER])).toBe(false);
  });

  it("met le SLA en pause pendant le blocage et conserve l’état de pause côté ticket", () => {
    const now = new Date(2026, 7, 3, 12, 0, 0);
    const paused = getTicketSlaState({
      status: TicketStatus.BLOCKED,
      firstResponseDueAt: null,
      resolutionDueAt: new Date(2026, 7, 3, 13, 0, 0),
      firstRespondedAt: new Date(2026, 7, 3, 9, 0, 0),
      resolvedAt: null,
      slaPausedAt: new Date(2026, 7, 3, 10, 0, 0),
    }, now);

    expect(paused.state).toBe("PAUSED");
    const transition = ticketWorkflowService.slice(ticketWorkflowService.indexOf("export async function transitionTicket"));
    expect(transition).toContain("pauseDurationMinutes");
    expect(transition).toContain("totalPausedMinutes");
    expect(transition).toContain("slaPausedAt");
  });
});

describe("Prompt 8 — confidentialité, permissions et traçabilité", () => {
  it("isole les tickets confidentiels et les tickets hors périmètre", () => {
    const confidential = { ...unassignedTicket, confidential: true, authorizedUserIds: ["cnamed-user"] };
    expect(canViewTicket({ id: "cnamed-user", roles: [] }, confidential)).toBe(true);
    expect(canViewTicket({ id: "outside", roles: [{ code: RoleCode.AGENT }] }, confidential)).toBe(false);
    expect(canViewTicket({ id: "outside", departmentId: unassignedTicket.departmentId, roles: [{ code: RoleCode.REQUESTER }] }, unassignedTicket)).toBe(false);
    expect(canReadReporting({ id: "reader", roles: [{ code: RoleCode.REPORTING_READER }] }, confidential)).toBe(false);
  });

  it("crée les événements, audits et notifications nécessaires pour les actions sensibles", () => {
    const actions = [
      ["export async function createTicket", "export async function findCreatedTicketByToken"],
      ["export async function assignTicket", "export async function claimTicket"],
      ["export async function claimTicket", "export async function addTicketMessage"],
      ["export async function transferTicket", "export async function grantConfidentialAccess"],
      ["export async function grantConfidentialAccess", "export async function listVisibleQueues"],
    ];

    for (const [index, [start, end]] of actions.entries()) {
      const action = section(ticketService, start, end);
      expect(action).toMatch(index === 0 ? /events:/ : /ticketEvent|recordAssignment/);
      expect(action).toMatch(/appendAuditLog|recordAssignment/);
    }

    const transition = ticketWorkflowService.slice(ticketWorkflowService.indexOf("export async function transitionTicket"));
    expect(transition).toContain("ticketEvent.create");
    expect(transition).toContain("appendAuditLog");

    expect(ticketService).toContain("createInAppNotification");
    expect(source("lib/notifications.ts")).toContain("status: NotificationStatus.PENDING");
    expect(source("lib/audit.ts")).toContain("db.auditLog.create");
  });

  it("conserve les historiques d’affectation et interdit leur modification", () => {
    const migration = source("prisma/migrations/20260811150000_harden_access_control/migration.sql");
    expect(migration).toContain("ticket_assignment_append_only");
    expect(migration).toContain("ticket_event_append_only");
    expect(migration).toContain("audit_log_append_only");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
    expect(source("prisma/migrations/20260811120000_add_entra_department_validation/migration.sql")).toContain("ticket_immutable_delete");
  });
});

describe("Prompt 8 — routes, espaces et rôles", () => {
  it("protège côté serveur toutes les routes API applicatives", () => {
    const routes = walk(resolve(projectRoot, "app/api"))
      .filter((path) => path.endsWith("route.ts"))
      .filter((path) => !path.includes(`${join("api", "auth")}${resolve(projectRoot, "app/api").includes("\\") ? "\\" : "/"}`))
      .filter((path) => !path.includes(`${join("api", "jobs")}${resolve(projectRoot, "app/api").includes("\\") ? "\\" : "/"}`));

    for (const path of routes) {
      const content = readFileSync(path, "utf8");
      expect(content, relative(projectRoot, path)).toMatch(/require(?:SessionUserContext|AdminAccess|ApiPermission|Permission|Role|TicketAccess)/);
    }

    const job = source("app/api/jobs/sla-monitor/route.ts");
    expect(job).toContain("readServerEnvironment().CRON_SECRET");
    expect(job).toContain("authorization");
    expect(job).toContain("status: 403");
  });

  it("sépare l’espace normal et réserve /admin aux administrateurs", () => {
    const adminLayout = source("app/admin/layout.tsx");
    const appShell = source("components/app-shell.tsx");
    expect(adminLayout).toContain('requireAdminAccess("ANY")');
    expect(adminLayout).toContain("AdminAccessDenied");
    expect(appShell).toContain("RoleCode.FUNCTIONAL_ADMIN");
    expect(appShell).toContain("RoleCode.TECHNICAL_ADMIN");
    expect(source("app/admin/page.tsx")).toContain('requireAdminAccess("ANY")');
  });

  it("distingue les six rôles, l’administration fonctionnelle, la technique et le reporting", () => {
    const identity = source("lib/identity.ts");
    for (const role of [
      "REQUESTER",
      "AGENT",
      "QUEUE_MANAGER",
      "FUNCTIONAL_ADMIN",
      "TECHNICAL_ADMIN",
      "REPORTING_READER",
    ]) {
      expect(identity).toContain(`RoleCode.${role}`);
    }
    expect(source("app/admin/technical/page.tsx")).toContain('requireAdminAccess("TECHNICAL")');
    expect(source("lib/reporting-service.ts")).not.toMatch(/\.create\(|\.update\(|\.delete\(/);
    expect(canReadReporting({ id: "reader", roles: [{ code: RoleCode.REPORTING_READER }] }, {
      requesterId: "requester",
      assignedToId: null,
      queueId: "queue",
      departmentId: "department",
      confidential: false,
    })).toBe(true);
  });

  it("ne possède aucune route de suppression définitive des tickets", () => {
    const ticketRouteSources = walk(resolve(projectRoot, "app/api/tickets"))
      .filter((path) => path.endsWith("route.ts"))
      .map((path) => readFileSync(path, "utf8"));
    expect(ticketRouteSources.some((content) => /export async function DELETE/.test(content))).toBe(false);
    expect(ticketService).not.toMatch(/prisma\.ticket\.delete(?:Many)?\(/);
  });
});

describe("Prompt 8 — authentification et migrations", () => {
  it("conserve uniquement Microsoft Entra ID et les callbacks existants", () => {
    expect(isSupportedAuthProvider("microsoft-entra-id")).toBe(true);
    expect(authSource).toContain('provider !== "microsoft-entra-id"');
    expect(authSource).toContain("fetchEntraProfile");
    expect(authSource).toContain("syncUserFromEntraProfile");
    expect(authSource).not.toContain("CredentialsProvider");
    expect(authSource).not.toContain("GoogleProvider");
    expect(authSource).not.toContain("azure-ad");
  });

  it("ne laisse aucune référence active à l’ancien identifiant ni à une authentification locale", () => {
    const activeFiles = [
      ...walkTextSources(resolve(projectRoot, "app")),
      ...walkTextSources(resolve(projectRoot, "lib")),
      ...walkTextSources(resolve(projectRoot, "components")),
      resolve(projectRoot, ".env.example"),
    ].filter(existsSync);
    const activeText = activeFiles.map((path) => readFileSync(path, "utf8")).join("\n");
    expect(activeText).not.toMatch(/azure-ad|azure_ad/i);
    expect(activeText).not.toMatch(/CredentialsProvider|GoogleProvider|Firebase|MongoDB/i);
  }, 15_000);

  it("conserve les migrations Prisma de département, de sécurité et d’espace administrateur", () => {
    const migrations = readdirSync(resolve(projectRoot, "prisma/migrations"));
    expect(migrations).toEqual(expect.arrayContaining([
      "0001_init",
      "0002_auth_google_identity",
      "0003_rename_microsoft_entra_provider",
      "20260807121312_add_ext_expires_in",
      "20260811120000_add_entra_department_validation",
      "20260811143000_add_ticket_source_department",
      "20260811150000_harden_access_control",
      "20260811170000_admin_space_controls",
      "20260812090000_managed_user_profiles",
    ]));
    expect(source("prisma/migrations/20260811143000_add_ticket_source_department/migration.sql")).toContain("sourceDepartmentId");
    expect(source("prisma/migrations/20260811170000_admin_space_controls/migration.sql")).toContain("NotificationRule");
  });

  it("ne contient pas de module hors ticketing", () => {
    const paths = walk(resolve(projectRoot, "app")).map((path) => relative(projectRoot, path).replaceAll("\\", "/"));
    expect(paths.some((path) => /(^|\/)(calls?|servers?|active-directory|network-tools?|remote-desktop|chat|scores?|badges?|rankings?)(\/|$)/i.test(path))).toBe(false);
  });
});
