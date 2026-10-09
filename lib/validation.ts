import {
  BlockReason,
  Impact,
  MessageVisibility,
  MissionStatus,
  NotificationChannel,
  NotificationType,
  Priority,
  RoleCode,
  SlaCalculationMode,
  TicketLinkType,
  TicketStatus,
  TicketType,
  Urgency,
} from "@prisma/client";
import { z } from "zod";

export const creationIdempotencyTokenSchema = z.string().trim().min(16).max(200).regex(/^[A-Za-z0-9_-]+$/);

export const createTicketSchema = z.object({
  serviceCatalogItemId: z.string().cuid().optional(),
  creationIdempotencyToken: creationIdempotencyTokenSchema.optional(),
  requestedService: z.string().trim().min(3).max(180).optional(),
  targetDepartmentId: z.string().cuid().optional(),
  type: z.enum(TicketType).optional(),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(15).max(20_000),
  confidential: z.boolean().default(false),
  confidentialityVersion: z.number().int().positive().optional(),
  impact: z.enum(Impact).default(Impact.MEDIUM),
  urgency: z.enum(Urgency).default(Urgency.MEDIUM),
  legalDueAt: z.coerce.date().nullable().optional(),
  dossierId: z.string().cuid().nullable().optional(),
  missionId: z.string().cuid().nullable().optional(),
}).strict().superRefine((value, context) => {
  const hasCatalog = Boolean(value.serviceCatalogItemId);
  const hasFreeText = Boolean(value.requestedService && value.targetDepartmentId);
  if (!hasCatalog && !hasFreeText) {
    context.addIssue({ code: "custom", path: ["requestedService"], message: "Sélectionnez un service ou décrivez votre besoin." });
  }
  if (value.requestedService && !value.targetDepartmentId) {
    context.addIssue({ code: "custom", path: ["targetDepartmentId"], message: "Le département cible est obligatoire pour une saisie libre." });
  }
});

export const createV1TicketSchema = z.object({
  serviceCatalogItemId: z.string().cuid().optional(),
  creationIdempotencyToken: creationIdempotencyTokenSchema.optional(),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(15).max(20_000),
}).strict().transform((value) => ({
  ...value,
  requestedService: undefined,
  targetDepartmentId: undefined,
  type: undefined,
  confidential: false as const,
  confidentialityVersion: undefined,
  impact: Impact.MEDIUM,
  urgency: Urgency.MEDIUM,
  legalDueAt: null,
  dossierId: null,
  missionId: null,
}));

export const addMessageSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
  visibility: z.enum(MessageVisibility).default(MessageVisibility.REQUESTER),
});

export const transitionTicketSchema = z.object({
  status: z.enum(TicketStatus),
  reason: z.string().trim().min(10).max(2_000).optional(),
  blockReason: z.enum(BlockReason).optional(),
  blockDetails: z.string().trim().max(2_000).optional(),
  resolutionCause: z.string().trim().max(5_000).optional(),
  resolutionAction: z.string().trim().max(5_000).optional(),
  resolutionSolution: z.string().trim().max(5_000).optional(),
  preventiveAction: z.string().trim().max(5_000).optional(),
  reopenedReason: z.string().trim().max(5_000).optional(),
}).superRefine((value, context) => {
  if (value.status === TicketStatus.BLOCKED) {
    if (!value.blockReason) context.addIssue({ code: "custom", path: ["blockReason"], message: "Le motif du blocage est obligatoire." });
    if (!value.blockDetails) context.addIssue({ code: "custom", path: ["blockDetails"], message: "Le détail du blocage est obligatoire." });
  }
  if (value.status === TicketStatus.RESOLUTION_PENDING) {
    if (!value.resolutionCause) context.addIssue({ code: "custom", path: ["resolutionCause"], message: "La cause est obligatoire." });
    if (!value.resolutionAction) context.addIssue({ code: "custom", path: ["resolutionAction"], message: "L’action est obligatoire." });
    if (!value.resolutionSolution) context.addIssue({ code: "custom", path: ["resolutionSolution"], message: "La solution est obligatoire." });
  }
  if (value.status === TicketStatus.CANCELLED && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "Le motif d’annulation est obligatoire (10 caractères minimum)." });
  }
  if (value.status === TicketStatus.REOPENED && !value.reopenedReason) {
    context.addIssue({ code: "custom", path: ["reopenedReason"], message: "Le motif de réouverture est obligatoire." });
  }
});

export const assignmentSchema = z.object({
  assignedToId: z.string().cuid(),
  // Any manual assignment or reassignment changes the operational ownership
  // of a ticket and must remain explainable in the audit trail.
  reason: z.string().trim().min(10).max(1_000),
});

export const claimTicketSchema = z.object({
  reason: z.string().trim().max(1_000).optional(),
});

export const queueTransferSchema = z.object({
  queueId: z.string().cuid(),
  reason: z.string().trim().min(10).max(2_000),
});

export const confidentialAccessSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().trim().min(10).max(2_000),
});

export const ticketQualificationSchema = z.object({
  serviceCatalogItemId: z.string().cuid().optional(),
  impact: z.enum(Impact),
  urgency: z.enum(Urgency),
  legalDueAt: z.coerce.date().nullable().optional(),
  priority: z.enum(Priority).optional(),
  reason: z.string().trim().min(10).max(2_000),
}).strict();

export const ticketLinkSchema = z.object({
  toTicketId: z.string().cuid(),
  type: z.enum(TicketLinkType),
  reason: z.string().trim().min(10).max(2_000).optional(),
}).strict();

export const slaExceptionSchema = z.object({
  addedMinutes: z.number().int().min(1).max(2_000_000),
  reason: z.string().trim().min(10).max(2_000),
}).strict();

export const clientAccountSchema = z.object({
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(180),
}).strict();

export const dossierSchema = z.object({
  clientId: z.string().cuid(),
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(180),
  confidential: z.boolean().default(false),
}).strict();

export const missionSchema = z.object({
  dossierId: z.string().cuid(),
  departmentId: z.string().cuid().nullable().optional(),
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(180),
  dueAt: z.coerce.date().nullable().optional(),
  budgetMinutes: z.number().int().positive().max(10_000_000).nullable().optional(),
}).strict();

export const assetSchema = z.object({
  assetTag: z.string().trim().min(2).max(80),
  type: z.enum(["COMPUTER", "SCREEN", "PHONE", "ACCESSORY", "LICENSE", "OTHER"]),
  name: z.string().trim().min(2).max(180),
  serialNumber: z.string().trim().max(180).nullable().optional(),
  departmentId: z.string().cuid().nullable().optional(),
  assignedToId: z.string().cuid().nullable().optional(),
  licenseExpiresAt: z.coerce.date().nullable().optional(),
}).strict();

export const assetMovementSchema = z.object({
  toUserId: z.string().cuid().nullable().optional(),
  toDepartmentId: z.string().cuid().nullable().optional(),
  reason: z.string().trim().min(10).max(2_000),
}).strict();

export const worklogSchema = z.object({
  ticketId: z.string().cuid(),
  missionId: z.string().cuid().nullable().optional(),
  minutes: z.number().int().positive().max(1_440),
  note: z.string().trim().min(3).max(2_000),
  startedAt: z.coerce.date().optional(),
}).strict();

export const knowledgeArticleStatusSchema = z.object({
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
  reason: z.string().trim().min(10).max(2_000),
}).strict();

export const knowledgeArticleSchema = z.object({
  title: z.string().trim().min(5).max(180),
  body: z.string().trim().min(20).max(50_000),
  departmentId: z.string().cuid().nullable().optional(),
  reviewAt: z.coerce.date().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  // Kept as a compatibility input for existing clients; the service derives it from status.
  isPublished: z.boolean().optional(),
}).strict();

export const notificationPreferenceSchema = z.object({
  eventType: z.enum(NotificationType),
  channel: z.enum(NotificationChannel),
  enabled: z.boolean(),
}).strict();

export const notificationListQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().min(1).max(128).optional(),
}).strict();

export const cursorPageQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(128).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export const productionSearchQuerySchema = cursorPageQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
});

export const assetRequestSchema = z.object({
  assetType: z.enum(["COMPUTER", "PHONE", "ACCESSORY", "OTHER"]),
  reason: z.string().trim().min(10, "Le motif doit contenir au moins 10 caractères.").max(2000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const assetRequestReviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    assetId: z.string().cuid().optional(),
  }).strict(),
  z.object({
    decision: z.literal("ASSIGN"),
    assetId: z.string().cuid(),
  }).strict(),
  z.object({
    decision: z.literal("REJECT"),
    rejectedReason: z.string().trim().min(10, "Le motif de refus doit contenir au moins 10 caractères.").max(2000),
  }).strict(),
]);

export const missionListQuerySchema = productionSearchQuerySchema.extend({
  status: z.enum(MissionStatus).optional(),
  departmentId: z.string().cuid().optional(),
  dossierId: z.string().cuid().optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

const workflowStepSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(180),
  order: z.number().int().min(0),
  requiredRole: z.enum(RoleCode).nullable().optional(),
}).strict();

const workflowTransitionSchema = z.object({
  from: z.string().trim().min(1).max(80),
  to: z.string().trim().min(1).max(80),
  reasonRequired: z.boolean().default(false),
}).strict();

export const workflowDefinitionSchema = z.object({
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(180),
  entityType: z.enum(["TICKET", "MISSION"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  version: z.number().int().positive().default(1),
  steps: z.array(workflowStepSchema).min(1).max(100),
  transitions: z.array(workflowTransitionSchema).max(300),
}).superRefine((value, context) => {
  const codes = new Set(value.steps.map((step) => step.code));
  for (const transition of value.transitions) {
    if (!codes.has(transition.from) || !codes.has(transition.to)) {
      context.addIssue({ code: "custom", path: ["transitions"], message: "Chaque transition doit référencer deux étapes existantes." });
      break;
    }
  }
}).strict();

export const entraDepartmentMappingSchema = z.object({
  externalValue: z.string().trim().min(1).max(320),
  departmentId: z.string().cuid(),
  isActive: z.boolean().default(true),
  reason: z.string().trim().min(10).max(2_000),
});

export const userStatusAdminSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED", "PENDING_ASSIGNMENT", "PENDING_VALIDATION"]),
  reason: z.string().trim().min(10, "Un motif d’au moins 10 caractères est obligatoire.").max(2_000),
});

/**
 * The browser may submit only application-owned profile fields. Identity
 * fields (Entra object id and e-mail) deliberately do not exist in this
 * schema, so a client cannot smuggle them into an admin mutation.
 */
export const userProfileAdminSchema = z.object({
  managedDisplayName: z.string().trim().min(2).max(180),
  departmentId: z.string().cuid().nullable(),
  managerId: z.string().cuid().nullable(),
  primaryRoleCode: z.enum(RoleCode).nullable(),
  primaryTeamId: z.string().cuid().nullable(),
  authorizedQueueId: z.string().cuid().nullable(),
  status: z.enum(["ACTIVE", "DISABLED", "PENDING_ASSIGNMENT", "PENDING_VALIDATION"]),
  reason: z.string().trim().min(10, "Un motif d’au moins 10 caractères est obligatoire.").max(2_000),
}).strict();

export const ticketListScopeSchema = z.enum([
  "all",
  "unassigned",
  "mine",
  "team",
  "requested",
]);

export const ticketListSlaSchema = z.enum(["attention", "breached"]);
export const ticketListSortSchema = z.enum(["updated_desc", "created_desc", "created_asc", "status_asc"]);

export const ticketListQuerySchema = z.object({
  status: z.enum(TicketStatus).optional(),
  priority: z.enum(Priority).optional(),
  scope: ticketListScopeSchema.default("all"),
  sla: ticketListSlaSchema.optional(),
  departmentId: z.string().cuid().optional(),
  queueId: z.string().cuid().optional(),
  dossierId: z.string().cuid().optional(),
  missionId: z.string().cuid().optional(),
  q: z.string().trim().max(120).optional(),
  sort: ticketListSortSchema.default("updated_desc"),
  cursor: z.string().trim().min(1).max(512).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type TransitionTicketInput = z.infer<typeof transitionTicketSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type ClaimTicketInput = z.infer<typeof claimTicketSchema>;
export type QueueTransferInput = z.infer<typeof queueTransferSchema>;
export type ConfidentialAccessInput = z.infer<typeof confidentialAccessSchema>;
export type TicketQualificationInput = z.infer<typeof ticketQualificationSchema>;
export type TicketLinkInput = z.infer<typeof ticketLinkSchema>;
export type SlaExceptionInput = z.infer<typeof slaExceptionSchema>;
export type ClientAccountInput = z.infer<typeof clientAccountSchema>;
export type DossierInput = z.infer<typeof dossierSchema>;
export type MissionInput = z.infer<typeof missionSchema>;
export type AssetInput = z.infer<typeof assetSchema>;
export type AssetMovementInput = z.infer<typeof assetMovementSchema>;
export type AssetRequestInput = z.infer<typeof assetRequestSchema>;
export type AssetRequestReviewInput = z.infer<typeof assetRequestReviewSchema>;
export type WorklogInput = z.infer<typeof worklogSchema>;
export type KnowledgeArticleInput = z.infer<typeof knowledgeArticleSchema>;
export type KnowledgeArticleStatusInput = z.infer<typeof knowledgeArticleStatusSchema>;
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
export type WorkflowDefinitionInput = z.infer<typeof workflowDefinitionSchema>;
export type EntraDepartmentMappingInput = z.infer<typeof entraDepartmentMappingSchema>;
export type UserStatusAdminInput = z.infer<typeof userStatusAdminSchema>;
export type UserProfileAdminInput = z.infer<typeof userProfileAdminSchema>;
export type OrganizationAdminInput = z.infer<typeof organizationAdminSchema>;
export type HolidayAdminInput = z.infer<typeof holidayAdminSchema>;

export const deleteAdminSchema = z.object({
  reason: z.string().trim().min(10, "Un motif d’au moins 10 caractères est obligatoire.").max(2_000),
}).strict();

export type DeleteAdminInput = z.infer<typeof deleteAdminSchema>;

const adminReason = z.string().trim().min(10, "Un motif d’au moins 10 caractères est obligatoire.").max(2_000);

export const departmentAdminSchema = z.object({
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  name: z.string().trim().min(2).max(160),
  isActive: z.boolean().default(true),
  reason: adminReason,
});

export const v1TriageConfigurationSchema = z.object({
  defaultTriageSlaId: z.string().cuid().nullable(),
  globalTriageServiceId: z.string().cuid().nullable(),
  reason: adminReason,
}).strict();

export const queueAdminSchema = z.object({
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  name: z.string().trim().min(2).max(160),
  departmentId: z.string().cuid(),
  managerId: z.string().cuid().nullable().optional(),
  autoAssignment: z.boolean().default(false),
  isActive: z.boolean().default(true),
  reason: adminReason,
});

export const teamAdminSchema = z.object({
  name: z.string().trim().min(2).max(160),
  queueId: z.string().cuid(),
  leadId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().default(true),
  reason: adminReason,
});

export const teamMemberAdminSchema = z.object({
  userId: z.string().cuid(),
  isActive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  skills: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  reason: adminReason,
});

export const catalogAdminSchema = z.object({
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2_000).nullable().optional(),
  ticketType: z.enum(TicketType),
  category: z.string().trim().min(2).max(120),
  keywords: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  queueId: z.string().cuid(),
  priorityDefault: z.enum(Priority),
  slaId: z.string().cuid(),
  isActive: z.boolean().default(true),
  allowConfidentialTickets: z.boolean().default(false),
  confidentialPrimaryRecipientId: z.string().cuid().nullable().optional(),
  confidentialSubstituteId: z.string().cuid().nullable().optional(),
  reason: adminReason,
}).superRefine((value, context) => {
  if (value.allowConfidentialTickets && !value.confidentialPrimaryRecipientId) context.addIssue({ code: "custom", path: ["confidentialPrimaryRecipientId"], message: "Un destinataire principal actif est obligatoire." });
  if (value.confidentialPrimaryRecipientId && value.confidentialPrimaryRecipientId === value.confidentialSubstituteId) context.addIssue({ code: "custom", path: ["confidentialSubstituteId"], message: "Le remplaçant doit être différent du destinataire principal." });
});

export const confidentialDelegationAdminSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  actions: z.array(z.enum(["VIEW", "COMMENT", "REPLY", "PROCESS", "STATUS", "ATTACHMENT", "ASSIGN", "TRANSFER", "CLOSE"])).min(1),
  reason: adminReason,
}).superRefine((value, context) => { if (value.endsAt && value.endsAt <= value.startsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "La fin doit être postérieure au début." }); });
export const confidentialDelegationRevokeSchema = z.object({ reason: adminReason });

export const organizationAdminSchema = z.object({
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  name: z.string().trim().min(2).max(180),
  isActive: z.boolean().default(true),
  reason: adminReason,
});

export const calendarAdminSchema = z.object({
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  name: z.string().trim().min(2).max(180),
  organizationId: z.string().cuid(),
  timezone: z.string().trim().min(1).max(80).refine((timezone) => {
    try {
      new Intl.DateTimeFormat("fr-FR", { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }, "Le fuseau horaire doit être un identifiant IANA valide."),
  workingDays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  workdayStartMinute: z.number().int().min(0).max(1_439),
  workdayEndMinute: z.number().int().min(1).max(1_440),
  isActive: z.boolean().default(true),
  reason: adminReason,
}).refine((value) => value.workdayEndMinute > value.workdayStartMinute, {
  message: "La fin de journée doit être postérieure au début.",
  path: ["workdayEndMinute"],
});

export const holidayAdminSchema = z.object({
  date: z.coerce.date(),
  name: z.string().trim().min(2).max(180),
  reason: adminReason,
});

export const slaAdminSchema = z.object({
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  name: z.string().trim().min(2).max(180),
  firstResponseMinutes: z.number().int().positive().max(2_000_000),
  resolutionMinutes: z.number().int().positive().max(2_000_000),
  calendarId: z.string().cuid(),
  calculationMode: z.enum(SlaCalculationMode).default(SlaCalculationMode.ROLLING),
  alertThresholds: z.array(z.number().int().min(1).max(100)).min(1).max(10),
  isActive: z.boolean().default(true),
  reason: adminReason,
}).superRefine((value, context) => {
  if (new Set(value.alertThresholds).size !== value.alertThresholds.length) {
    context.addIssue({ code: "custom", path: ["alertThresholds"], message: "Les seuils SLA doivent être uniques." });
  }
});

export const escalationRuleAdminSchema = z.object({
  name: z.string().trim().min(2).max(180),
  thresholdPercent: z.number().int().min(1).max(100),
  queueId: z.string().cuid().nullable().optional(),
  serviceItemId: z.string().cuid().nullable().optional(),
  targetRole: z.enum(RoleCode),
  isActive: z.boolean().default(true),
  reason: adminReason,
}).superRefine((value, context) => {
  const targets = [value.queueId, value.serviceItemId].filter(Boolean);
  if (targets.length !== 1) {
    context.addIssue({ code: "custom", path: ["queueId"], message: "Une règle doit cibler une file ou un service, mais pas les deux." });
  }
});

export const roleAssignmentAdminSchema = z.object({
  roleCode: z.enum(RoleCode),
  scopeId: z.string().cuid().nullable().optional(),
  reason: adminReason,
});

export const notificationRuleAdminSchema = z.object({
  name: z.string().trim().min(2).max(180),
  eventType: z.enum(NotificationType),
  channel: z.enum(NotificationChannel),
  recipientRole: z.enum(RoleCode),
  departmentId: z.string().cuid().nullable().optional(),
  queueId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().default(true),
  reason: adminReason,
});

export type DepartmentAdminInput = z.infer<typeof departmentAdminSchema>;
export type V1TriageConfigurationInput = z.infer<typeof v1TriageConfigurationSchema>;
export type QueueAdminInput = z.infer<typeof queueAdminSchema>;
export type TeamAdminInput = z.infer<typeof teamAdminSchema>;
export type TeamMemberAdminInput = z.infer<typeof teamMemberAdminSchema>;
export type CatalogAdminInput = z.infer<typeof catalogAdminSchema>;
export type CalendarAdminInput = z.infer<typeof calendarAdminSchema>;
export type SlaAdminInput = z.infer<typeof slaAdminSchema>;
export type EscalationRuleAdminInput = z.infer<typeof escalationRuleAdminSchema>;
export type RoleAssignmentAdminInput = z.infer<typeof roleAssignmentAdminSchema>;
export type NotificationRuleAdminInput = z.infer<typeof notificationRuleAdminSchema>;
