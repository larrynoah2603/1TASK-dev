import { WorkflowStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthorizationError, requireCurrentActor, type UserContext } from "@/lib/server-auth";
import { appendAuditLog } from "@/lib/audit";
import { workflowDefinitionSchema, type WorkflowDefinitionInput } from "@/lib/validation";
import { requireProductCapability } from "@/lib/product-policy.server";

function ensureWorkflowPermission(actor: UserContext) {
  const permissions = actor.roleAssignments.flatMap((assignment) => assignment.role.permissions.map((item) => item.permission.code));
  if (!permissions.includes("workflow:manage")) throw new AuthorizationError("La gestion des workflows n’est pas autorisée.");
}

export async function listWorkflowDefinitions(actor: UserContext) {
  requireProductCapability("workflowDefinitions");
  actor = await requireCurrentActor(actor);
  ensureWorkflowPermission(actor);
  return prisma.workflowDefinition.findMany({ orderBy: [{ entityType: "asc" }, { name: "asc" }, { version: "desc" }] });
}

export async function saveWorkflowDefinition(actor: UserContext, input: WorkflowDefinitionInput) {
  requireProductCapability("workflowDefinitions");
  actor = await requireCurrentActor(actor);
  ensureWorkflowPermission(actor);
  const parsed = workflowDefinitionSchema.parse(input);
  const definition = await prisma.workflowDefinition.upsert({
    where: { code: parsed.code },
    update: { name: parsed.name, entityType: parsed.entityType, status: parsed.status, version: parsed.version, steps: parsed.steps, transitions: parsed.transitions },
    create: { code: parsed.code, name: parsed.name, entityType: parsed.entityType, status: parsed.status, version: parsed.version, steps: parsed.steps, transitions: parsed.transitions },
  });
  await appendAuditLog(prisma, { actorId: actor.id, action: "WORKFLOW_DEFINITION_SAVED", objectType: "WorkflowDefinition", objectId: definition.id, newValue: parsed, reason: "Enregistrement d’un workflow déclaratif." });
  return definition;
}

export async function publishWorkflowDefinition(actor: UserContext, code: string) {
  requireProductCapability("workflowDefinitions");
  actor = await requireCurrentActor(actor);
  ensureWorkflowPermission(actor);
  const definition = await prisma.workflowDefinition.findUnique({ where: { code } });
  if (!definition) throw new AuthorizationError("Workflow introuvable.");
  const updated = await prisma.workflowDefinition.update({ where: { code }, data: { status: WorkflowStatus.ACTIVE, version: definition.version + 1 } });
  await appendAuditLog(prisma, { actorId: actor.id, action: "WORKFLOW_DEFINITION_PUBLISHED", objectType: "WorkflowDefinition", objectId: updated.id, oldValue: { status: definition.status, version: definition.version }, newValue: { status: updated.status, version: updated.version }, reason: "Publication d’un workflow déclaratif." });
  return updated;
}
