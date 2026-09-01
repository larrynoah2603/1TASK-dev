import { RoleCode, UserStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * Primary bootstrap administrator for the 1TASK prototype.
 *
 * This is only a role bootstrap after a successful Microsoft Entra ID
 * synchronization. It never creates a local account or a second login path.
 */
export const DEFAULT_BOOTSTRAP_ADMIN_EMAIL = "larry.andrianina@bios-expertise.com";

export const ROLE_LABELS: Record<RoleCode, string> = {
  [RoleCode.REQUESTER]: "Demandeur",
  [RoleCode.AGENT]: "Agent / traitant",
  [RoleCode.QUEUE_MANAGER]: "Responsable de file",
  [RoleCode.FUNCTIONAL_ADMIN]: "Administrateur fonctionnel",
  [RoleCode.TECHNICAL_ADMIN]: "Administrateur technique",
  [RoleCode.REPORTING_READER]: "Lecteur de reporting",
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  [RoleCode.REQUESTER]: "Crée et suit ses propres tickets.",
  [RoleCode.AGENT]: "Traite les tickets de ses files ou équipes.",
  [RoleCode.QUEUE_MANAGER]: "Affecte, réaffecte et supervise une ou plusieurs files.",
  [RoleCode.FUNCTIONAL_ADMIN]: "Configure l’organisation, le catalogue, les rôles et les SLA.",
  [RoleCode.TECHNICAL_ADMIN]: "Gère la configuration technique explicitement autorisée.",
  [RoleCode.REPORTING_READER]: "Consulte uniquement les rapports autorisés en lecture seule.",
};

/**
 * The permission catalog is application data, not demonstration data.  It is
 * also kept here as a runtime fallback so a real Entra administrator can be
 * bootstrapped even when the optional demo seed has never been executed.
 */
export const PERMISSION_CATALOG = {
  "ticket:create": "Créer un ticket",
  "ticket:create:cross-department": "Créer un ticket vers une file d’un autre département",
  "ticket:read": "Lire les tickets autorisés",
  "ticket:update": "Modifier un ticket autorisé",
  "ticket:comment:public": "Ajouter un commentaire public",
  "ticket:comment:internal": "Ajouter un commentaire interne",
  "ticket:process": "Démarrer et poursuivre le traitement",
  "ticket:block": "Bloquer ou mettre un ticket en attente",
  "ticket:resolve": "Soumettre une résolution",
  "ticket:confirm-resolution": "Confirmer une résolution",
  "ticket:reopen": "Rouvrir un ticket avec justification",
  "ticket:assign": "Affecter un ticket dans une file autorisée",
  "ticket:claim": "Prendre en charge un ticket de sa file",
  "ticket:transfer": "Transférer un ticket vers une file autorisée",
  "ticket:confidential-access": "Accorder un accès nominatif à un ticket confidentiel",
  "ticket:internal-comment": "Ajouter un commentaire interne",
  "ticket:export": "Exporter les tickets non confidentiels autorisés",
  "catalog:manage": "Administrer le catalogue",
  "catalog:propose": "Proposer un nouveau service catalogue",
  "organization:manage": "Administrer l’organisation",
  "role:manage": "Administrer les rôles et les droits",
  "entra-department:manage": "Gérer les correspondances Entra-département",
  "user:validate": "Valider le provisioning d’un utilisateur",
  "sla:manage": "Administrer les SLA et calendriers",
  "reporting:read": "Lire les indicateurs autorisés",
  "reporting:export": "Exporter les indicateurs autorisés",
  "audit:read": "Lire le journal d’audit",
  "technical:manage": "Gérer la configuration technique autorisée",
  "portfolio:read": "Lire les dossiers et missions autorisés",
  "portfolio:manage": "Gérer les dossiers, missions et workflows de production",
  "asset:read": "Lire les actifs autorisés",
  "asset:manage": "Gérer les actifs et mouvements",
  "worklog:create": "Imputer du temps sur les tickets autorisés",
  "knowledge:read": "Lire les articles de connaissance autorisés",
  "knowledge:manage": "Gérer les articles de connaissance",
  "notification:preferences": "Gérer ses préférences de notification",
  "workflow:manage": "Gérer les workflows déclaratifs",
} as const;

type PermissionCode = keyof typeof PERMISSION_CATALOG;

export const ROLE_PERMISSION_CODES: Record<RoleCode, readonly PermissionCode[]> = {
  [RoleCode.REQUESTER]: [
    "ticket:create",
    "ticket:create:cross-department",
    "ticket:read",
    "ticket:update",
    "ticket:comment:public",
    "ticket:confirm-resolution",
    "ticket:reopen",
  ],
  [RoleCode.AGENT]: [
    "ticket:create:cross-department",
    "ticket:read",
    "ticket:update",
    "ticket:comment:public",
    "ticket:comment:internal",
    "ticket:claim",
    "ticket:internal-comment",
    "ticket:process",
    "ticket:block",
    "ticket:resolve",
    "portfolio:read",
    "worklog:create",
    "knowledge:read",
    "catalog:propose",
    "notification:preferences",
  ],
  [RoleCode.QUEUE_MANAGER]: [
    "ticket:create:cross-department",
    "ticket:read",
    "ticket:update",
    "ticket:comment:public",
    "ticket:comment:internal",
    "ticket:assign",
    "ticket:transfer",
    "ticket:confidential-access",
    "ticket:internal-comment",
    "ticket:block",
    "ticket:resolve",
    "ticket:export",
    "reporting:read",
    "portfolio:read",
    "worklog:create",
    "knowledge:read",
    "notification:preferences",
    "workflow:manage",
    "catalog:propose",
  ],
  [RoleCode.FUNCTIONAL_ADMIN]: Object.keys(PERMISSION_CATALOG) as PermissionCode[],
  [RoleCode.TECHNICAL_ADMIN]: ["technical:manage"],
  [RoleCode.REPORTING_READER]: ["reporting:read", "reporting:export", "portfolio:read", "knowledge:read"],
};

async function ensureRolePermissions(
  tx: Prisma.TransactionClient,
  roleId: string,
  code: RoleCode,
) {
  for (const permissionCode of ROLE_PERMISSION_CODES[code]) {
    const permission = await tx.permission.upsert({
      where: { code: permissionCode },
      update: { description: PERMISSION_CATALOG[permissionCode] },
      create: { code: permissionCode, description: PERMISSION_CATALOG[permissionCode] },
    });
    await tx.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      update: {},
      create: { roleId, permissionId: permission.id },
    });
  }
}

export async function ensureRole(tx: Prisma.TransactionClient, code: RoleCode) {
  const role = await tx.role.upsert({
    where: { code },
    update: { name: ROLE_LABELS[code], description: ROLE_DESCRIPTIONS[code] },
    create: { code, name: ROLE_LABELS[code], description: ROLE_DESCRIPTIONS[code] },
  });
  await ensureRolePermissions(tx, role.id, code);
  return role;
}

async function ensureRoleAssignment(
  tx: Prisma.TransactionClient,
  input: { userId: string; roleId: string; assignedById?: string },
) {
  const existing = await tx.userRole.findFirst({
    where: { userId: input.userId, roleId: input.roleId, scopeId: null },
  });
  if (existing) return false;

  await tx.userRole.create({
    data: {
      userId: input.userId,
      roleId: input.roleId,
      assignedById: input.assignedById,
    },
  });
  return true;
}

/** Assigns the baseline requester role to every synchronized Entra account. */
export async function ensureRequesterRole(tx: Prisma.TransactionClient, userId: string) {
  const requesterRole = await ensureRole(tx, RoleCode.REQUESTER);
  await ensureRoleAssignment(tx, { userId, roleId: requesterRole.id });
}

function bootstrapAdminEmails(): Set<string> {
  // Never ship a source-controlled privileged identity as an implicit
  // production administrator. Production bootstrap must be explicitly
  // configured through ADMIN_EMAILS.
  const developmentDefaults = process.env.NODE_ENV === "production"
    ? []
    : [DEFAULT_BOOTSTRAP_ADMIN_EMAIL];
  return new Set(
    [...developmentDefaults, ...(process.env.ADMIN_EMAILS ?? "").split(/[;,]/)]
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isBootstrapFunctionalAdminEmail(email: string): boolean {
  return bootstrapAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Resolves the application status after a Microsoft Entra synchronization.
 * A configured bootstrap administrator is a real Entra user: the first
 * successful sign-in creates/updates that user as ACTIVE and grants the
 * functional-admin role. Other new identities remain pending.
 */
export function statusAfterEntraSynchronization(input: {
  email: string;
  accountEnabled?: boolean;
  administrativelyDisabled: boolean;
  firstSynchronization: boolean;
  existingStatus?: UserStatus;
}): UserStatus {
  if (input.accountEnabled === false || input.administrativelyDisabled) {
    return UserStatus.DISABLED;
  }

  const pendingStatus =
    input.existingStatus === UserStatus.PENDING_VALIDATION ||
    input.existingStatus === UserStatus.PENDING_ASSIGNMENT;

  if (
    isBootstrapFunctionalAdminEmail(input.email) &&
    (input.firstSynchronization || pendingStatus)
  ) {
    return UserStatus.ACTIVE;
  }

  if (input.firstSynchronization || input.existingStatus === UserStatus.PENDING_VALIDATION) {
    return UserStatus.PENDING_ASSIGNMENT;
  }

  return input.existingStatus ?? UserStatus.PENDING_ASSIGNMENT;
}

/**
 * Keeps the existing environment-based bootstrap convention available. It
 * grants only the functional-admin role and never creates a local login.
 */
export async function ensureBootstrapFunctionalAdmin(
  tx: Prisma.TransactionClient,
  input: { userId: string; email: string },
) {
  if (!isBootstrapFunctionalAdminEmail(input.email)) return false;

  const role = await ensureRole(tx, RoleCode.FUNCTIONAL_ADMIN);
  const created = await ensureRoleAssignment(tx, {
    userId: input.userId,
    roleId: role.id,
  });
  if (created) {
    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        action: "BOOTSTRAP_FUNCTIONAL_ADMIN_GRANTED",
        objectType: "UserRole",
        objectId: input.userId,
        newValue: { role: RoleCode.FUNCTIONAL_ADMIN, source: "1TASK_ADMIN_EMAILS" },
        reason: "Administrateur fonctionnel bootstrapé après authentification Microsoft Entra ID.",
      },
    });
  }
  return created;
}
