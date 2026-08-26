import { PrismaClient, Priority, RoleCode, ScopeType, TicketType, UserStatus } from "@prisma/client";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/identity";

const prisma = new PrismaClient();

const permissionCatalog = [
  ["ticket:create", "Créer un ticket"],
  ["ticket:create:cross-department", "Créer un ticket vers une file d’un autre département"],
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
  ["catalog:propose", "Proposer un nouveau service catalogue"],
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
    REQUESTER: ["ticket:create", "ticket:create:cross-department", "ticket:read", "ticket:update", "ticket:comment:public", "ticket:confirm-resolution", "ticket:reopen"],
    AGENT: ["ticket:create:cross-department", "ticket:read", "ticket:update", "ticket:comment:public", "ticket:comment:internal", "ticket:claim", "ticket:internal-comment", "ticket:process", "ticket:block", "ticket:resolve", "catalog:propose"],
    QUEUE_MANAGER: ["ticket:create:cross-department", "ticket:read", "ticket:update", "ticket:comment:public", "ticket:comment:internal", "ticket:assign", "ticket:transfer", "ticket:confidential-access", "ticket:internal-comment", "ticket:block", "ticket:resolve", "ticket:export", "reporting:read", "catalog:propose"],
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

  const organization = await prisma.organization.upsert({ where: { code: "DEFAULT" }, update: { name: "Organisation principale 1TASK", isActive: true }, create: { code: "DEFAULT", name: "Organisation principale 1TASK", isActive: true } });
  const calendar = await prisma.businessCalendar.upsert({ where: { code: "MADAGASCAR_STANDARD" }, update: { organizationId: organization.id }, create: { code: "MADAGASCAR_STANDARD", name: "Calendrier Madagascar standard", organizationId: organization.id, timezone: "Indian/Antananarivo", workingDays: [1, 2, 3, 4, 5], workdayStartMinute: 480, workdayEndMinute: 1020 } });
  const standardSla = await prisma.sLA.upsert({ where: { code: "STANDARD_8H_2J" }, update: {}, create: { code: "STANDARD_8H_2J", name: "Standard – première réponse 8 h / résolution 2 jours", firstResponseMinutes: 480, resolutionMinutes: 960, calendarId: calendar.id, alertThresholds: [50, 80, 100] } });

  const departmentSpecs = [
    ["EXP", "Expertise comptable"],
    ["SOCIAL", "Social et paie"],
    ["JUR", "Juridique"],
    ["AUDIT", "Audit"],
    ["IT", "Informatique"],
    ["RH", "Ressources humaines"],
    ["ADM", "Administratif, facturation et recouvrement"],
    ["ACCUEIL", "Accueil et services généraux"],
    ["DIR", "Direction"],
  ] as const;
  const departmentMap = new Map<string, { id: string; code: string; name: string }>();
  for (const [code, name] of departmentSpecs) {
    const department = await prisma.department.upsert({ where: { code }, update: { name, isActive: true }, create: { code, name } });
    departmentMap.set(code, department);
  }
  const it = departmentMap.get("IT")!;
  const dsi = it;
  const compta = departmentMap.get("EXP")!;
  const rh = departmentMap.get("RH")!;

  for (const [externalValue, departmentId] of [
    ["Informatique", it.id],
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

  for (const [code, department] of departmentMap) {
    const triageQueue = await prisma.queue.upsert({ where: { code: `TRIAGE-${code}` }, update: { name: `Triage ${code}`, departmentId: department.id, isActive: true, autoAssignment: false }, create: { code: `TRIAGE-${code}`, name: `Triage ${code}`, departmentId: department.id, isActive: true, autoAssignment: false } });
    const triageTeam = await prisma.team.upsert({ where: { queueId_name: { queueId: triageQueue.id, name: `Équipe triage ${code}` } }, update: { isActive: true }, create: { name: `Équipe triage ${code}`, queueId: triageQueue.id, isActive: true } });
    if (code === "IT") {
      await prisma.teamMember.upsert({ where: { teamId_userId: { teamId: triageTeam.id, userId: agent.id } }, update: { isActive: true, isAvailable: true, skills: ["triage", "support"] }, create: { teamId: triageTeam.id, userId: agent.id, skills: ["triage", "support"] } });
    }
    await prisma.serviceCatalogItem.upsert({ where: { code: `TRIAGE-${code}` }, update: { name: `Besoin spécifique à qualifier — ${department.name}`, queueId: triageQueue.id, slaId: standardSla.id, isActive: true }, create: { code: `TRIAGE-${code}`, name: `Besoin spécifique à qualifier — ${department.name}`, description: `Service technique de qualification pour les besoins libres du département ${department.name}.`, ticketType: TicketType.SERVICE_REQUEST, category: "À qualifier", keywords: ["triage", code.toLowerCase()], queueId: triageQueue.id, priorityDefault: Priority.MEDIUM, slaId: standardSla.id } });
  }

  const networkQueue = await prisma.queue.upsert({ where: { code: "IT-RESEAU" }, update: { managerId: manager.id }, create: { code: "IT-RESEAU", name: "Support réseau", departmentId: it.id, managerId: manager.id } });
  const hardwareQueue = await prisma.queue.upsert({ where: { code: "IT-MATERIEL" }, update: { managerId: manager.id }, create: { code: "IT-MATERIEL", name: "Support matériel", departmentId: it.id, managerId: manager.id } });
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
