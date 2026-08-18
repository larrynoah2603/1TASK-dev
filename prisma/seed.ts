import { PrismaClient, Priority, RoleCode, ScopeType, TicketType, UserStatus } from "@prisma/client";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/identity";

const prisma = new PrismaClient();

const permissionCatalog = [
  ["ticket:create", "Créer un ticket"],
  ["ticket:read", "Lire les tickets autorisés"],
  ["ticket:update", "Modifier un ticket autorisé"],
  ["ticket:comment:public", "Ajouter un commentaire public"],
  ["ticket:comment:internal", "Ajouter un commentaire interne"],
  ["ticket:process", "Démarrer et poursuivre le traitement"],
  ["ticket:block", "Bloquer ou mettre un ticket en attente"],
  ["ticket:resolve", "Soumettre une résolution"],
  ["ticket:confirm-resolution", "Confirmer une résolution"],
  ["ticket:reopen", "Rouvrir un ticket avec justification"],
  ["ticket:assign", "Affecter un ticket dans une file autorisée"],
  ["ticket:claim", "Prendre en charge un ticket de sa file"],
  ["ticket:transfer", "Transférer un ticket vers une file autorisée"],
  ["ticket:confidential-access", "Accorder un accès nominatif à un ticket confidentiel"],
  ["ticket:internal-comment", "Ajouter un commentaire interne"],
  ["ticket:export", "Exporter les tickets non confidentiels autorisés"],
  ["catalog:manage", "Administrer le catalogue"],
  ["organization:manage", "Administrer l’organisation"],
  ["role:manage", "Administrer les rôles et les droits"],
  ["entra-department:manage", "Gérer les correspondances Entra-département"],
  ["user:validate", "Valider le provisioning d’un utilisateur"],
  ["sla:manage", "Administrer les SLA et calendriers"],
  ["reporting:read", "Lire les indicateurs autorisés"],
  ["reporting:export", "Exporter les indicateurs autorisés"],
  ["audit:read", "Lire le journal d’audit"],
  ["technical:manage", "Gérer la configuration technique autorisée"],
] as const;

async function main() {
  for (const [code, description] of permissionCatalog) {
    await prisma.permission.upsert({ where: { code }, update: { description }, create: { code, description } });
  }

  const permissionIds = Object.fromEntries((await prisma.permission.findMany()).map((permission) => [permission.code, permission.id]));
  const rolePermissions: Record<RoleCode, string[]> = {
    REQUESTER: ["ticket:create", "ticket:read", "ticket:update", "ticket:comment:public", "ticket:confirm-resolution", "ticket:reopen"],
    AGENT: ["ticket:read", "ticket:update", "ticket:comment:public", "ticket:comment:internal", "ticket:claim", "ticket:internal-comment", "ticket:process", "ticket:block", "ticket:resolve"],
    QUEUE_MANAGER: ["ticket:read", "ticket:update", "ticket:comment:public", "ticket:comment:internal", "ticket:assign", "ticket:transfer", "ticket:confidential-access", "ticket:internal-comment", "ticket:block", "ticket:resolve", "ticket:export", "reporting:read"],
    FUNCTIONAL_ADMIN: permissionCatalog.map(([code]) => code),
    TECHNICAL_ADMIN: ["technical:manage"],
    REPORTING_READER: ["reporting:read", "reporting:export"],
  };
  for (const code of Object.values(RoleCode)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: ROLE_LABELS[code], description: ROLE_DESCRIPTIONS[code] },
      create: { code, name: ROLE_LABELS[code], description: ROLE_DESCRIPTIONS[code] },
    });
    const desiredPermissionIds = rolePermissions[code]
      .map((permissionCode) => permissionIds[permissionCode])
      .filter((permissionId): permissionId is string => Boolean(permissionId));
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: desiredPermissionIds } },
    });
    for (const permissionCode of rolePermissions[code]) {
      const permissionId = permissionIds[permissionCode];
      if (permissionId) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId } }, update: {}, create: { roleId: role.id, permissionId } });
    }
  }

  const calendar = await prisma.businessCalendar.upsert({ where: { code: "MADAGASCAR_STANDARD" }, update: {}, create: { code: "MADAGASCAR_STANDARD", name: "Calendrier Madagascar standard", timezone: "Indian/Antananarivo", workingDays: [1, 2, 3, 4, 5], workdayStartMinute: 480, workdayEndMinute: 1020 } });
  const standardSla = await prisma.sLA.upsert({ where: { code: "STANDARD_8H_2J" }, update: {}, create: { code: "STANDARD_8H_2J", name: "Standard – première réponse 8 h / résolution 2 jours", firstResponseMinutes: 480, resolutionMinutes: 960, calendarId: calendar.id, alertThresholds: [50, 80, 100] } });

  const dsi = await prisma.department.upsert({ where: { code: "DSI" }, update: { name: "DSI", isActive: true }, create: { code: "DSI", name: "DSI" } });
  const compta = await prisma.department.upsert({ where: { code: "EXPERTISE-COMPTABLE" }, update: { name: "Expertise comptable", isActive: true }, create: { code: "EXPERTISE-COMPTABLE", name: "Expertise comptable" } });
  const rh = await prisma.department.upsert({ where: { code: "RH" }, update: { name: "Ressources humaines", isActive: true }, create: { code: "RH", name: "Ressources humaines" } });

  for (const [externalValue, departmentId] of [
    ["DSI", dsi.id],
    ["Expertise comptable", compta.id],
    ["Ressources humaines", rh.id],
  ] as const) {
    await prisma.entraDepartmentMapping.upsert({
      where: { normalizedValue: normalizeEntraDepartmentValue(externalValue) },
      update: { externalValue, departmentId, isActive: true },
      create: {
        externalValue,
        normalizedValue: normalizeEntraDepartmentValue(externalValue),
        departmentId,
      },
    });
  }

  const manager = await prisma.user.upsert({ where: { entraObjectId: "demo-queue-manager" }, update: { status: UserStatus.ACTIVE, managedDisplayName: "Responsable démonstration", departmentId: dsi.id }, create: { entraObjectId: "demo-queue-manager", entraDisplayName: "Responsable démonstration", managedDisplayName: "Responsable démonstration", name: "Responsable démonstration", email: "manager.demo@example.invalid", departmentId: dsi.id, status: UserStatus.ACTIVE } });
  const agent = await prisma.user.upsert({ where: { entraObjectId: "demo-agent" }, update: { status: UserStatus.ACTIVE, managedDisplayName: "Agent démonstration", departmentId: dsi.id }, create: { entraObjectId: "demo-agent", entraDisplayName: "Agent démonstration", managedDisplayName: "Agent démonstration", name: "Agent démonstration", email: "agent.demo@example.invalid", departmentId: dsi.id, status: UserStatus.ACTIVE } });
  const requester = await prisma.user.upsert({ where: { entraObjectId: "demo-requester" }, update: { status: UserStatus.ACTIVE, managedDisplayName: "Demandeur démonstration", departmentId: compta.id }, create: { entraObjectId: "demo-requester", entraDisplayName: "Demandeur démonstration", managedDisplayName: "Demandeur démonstration", name: "Demandeur démonstration", email: "requester.demo@example.invalid", departmentId: compta.id, status: UserStatus.ACTIVE } });

  async function grantRole(userId: string, code: RoleCode) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    const existing = await prisma.userRole.findFirst({ where: { userId, roleId: role.id, scopeId: null } });
    if (!existing) await prisma.userRole.create({ data: { userId, roleId: role.id } });
  }
  await grantRole(manager.id, RoleCode.QUEUE_MANAGER);
  await grantRole(agent.id, RoleCode.AGENT);
  await grantRole(requester.id, RoleCode.REQUESTER);

  const networkQueue = await prisma.queue.upsert({ where: { code: "DSI-RESEAU" }, update: { managerId: manager.id }, create: { code: "DSI-RESEAU", name: "Support réseau", departmentId: dsi.id, managerId: manager.id } });
  const hardwareQueue = await prisma.queue.upsert({ where: { code: "DSI-MATERIEL" }, update: { managerId: manager.id }, create: { code: "DSI-MATERIEL", name: "Support matériel", departmentId: dsi.id, managerId: manager.id } });
  const networkTeam = await prisma.team.upsert({ where: { queueId_name: { queueId: networkQueue.id, name: "Équipe réseau" } }, update: { leadId: manager.id }, create: { name: "Équipe réseau", queueId: networkQueue.id, leadId: manager.id } });
  await prisma.teamMember.upsert({ where: { teamId_userId: { teamId: networkTeam.id, userId: agent.id } }, update: { isActive: true, isAvailable: true, skills: ["wifi", "réseau"] }, create: { teamId: networkTeam.id, userId: agent.id, skills: ["wifi", "réseau"] } });

  await prisma.serviceCatalogItem.upsert({ where: { code: "WIFI-CONNECTION" }, update: { queueId: networkQueue.id, slaId: standardSla.id }, create: { code: "WIFI-CONNECTION", name: "Problème de connexion Wi-Fi", description: "Incident de connexion au réseau Wi-Fi professionnel.", ticketType: TicketType.INCIDENT, category: "Réseau", keywords: ["wifi", "wi-fi", "connexion", "sans fil"], queueId: networkQueue.id, priorityDefault: Priority.MEDIUM, slaId: standardSla.id } });
  await prisma.serviceCatalogItem.upsert({ where: { code: "MATERIAL-FAILURE" }, update: { queueId: hardwareQueue.id, slaId: standardSla.id }, create: { code: "MATERIAL-FAILURE", name: "Panne de matériel", description: "Ordinateur, écran ou périphérique en panne.", ticketType: TicketType.INCIDENT, category: "Matériel", keywords: ["ordinateur", "écran", "clavier", "souris", "panne"], queueId: hardwareQueue.id, priorityDefault: Priority.MEDIUM, slaId: standardSla.id } });
  await prisma.escalationRule.deleteMany({ where: { queueId: networkQueue.id } });
  await prisma.escalationRule.createMany({ data: [{ name: "Alerte SLA 50 % réseau", thresholdPercent: 50, queueId: networkQueue.id }, { name: "Alerte SLA 80 % réseau", thresholdPercent: 80, queueId: networkQueue.id }, { name: "Dépassement SLA réseau", thresholdPercent: 100, queueId: networkQueue.id }] });

  const departmentScope = await prisma.permissionScope.upsert({ where: { id: "seed-scope-compta" }, update: {}, create: { id: "seed-scope-compta", name: "Département Expertise comptable", type: ScopeType.DEPARTMENT, departmentId: compta.id } });
  void departmentScope;
  console.log("Seed terminé. Données de démonstration créées sans identité réelle.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
