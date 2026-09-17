import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RoleCode } from "@prisma/client";
import { canViewTicket } from "@/lib/access-control";
import { isPendingFunctionalAdministrator } from "@/lib/server-auth";
import { userProfileAdminSchema } from "@/lib/validation";

const root = process.cwd();
const source = (path: string) => readFileSync(resolve(root, path), "utf8");
const managedProfileMigrations = [
  "prisma/migrations/20260812090000_managed_user_profiles/migration.sql",
  "prisma/migrations/20260812090100_managed_user_profile_fields/migration.sql",
].map(source).join("\n");
const cuid = (suffix: string) => `c${suffix.padEnd(24, "0").slice(0, 24)}`;

const validProfile = {
  managedDisplayName: "Prénom Nom",
  departmentId: cuid("department"),
  managerId: cuid("manager"),
  primaryRoleCode: RoleCode.AGENT,
  primaryTeamId: cuid("team"),
  authorizedQueueId: cuid("queue"),
  status: "ACTIVE" as const,
  reason: "Validation administrative de la fiche utilisateur.",
};

describe("profil utilisateur géré par l’administration fonctionnelle", () => {
  it("accepte les champs applicatifs et rejette les champs d’identité Entra", () => {
    expect(userProfileAdminSchema.parse(validProfile)).toMatchObject({
      managedDisplayName: "Prénom Nom",
      departmentId: validProfile.departmentId,
      managerId: validProfile.managerId,
    });

    expect(userProfileAdminSchema.safeParse({
      ...validProfile,
      email: "ne-doit-pas-etre-accepte@example.test",
    }).success).toBe(false);
    expect(userProfileAdminSchema.safeParse({
      ...validProfile,
      entraObjectId: "entra-object-id",
    }).success).toBe(false);
  });

  it("maintient Entra, le manager applicatif et le responsable de file dans trois relations distinctes", () => {
    const schema = source("prisma/schema.prisma");

    expect(schema).toContain('@relation("ApplicationManager"');
    expect(schema).toContain('@relation("EntraManager"');
    expect(schema).toContain('manager           User?                @relation("QueueManager"');
    expect(schema).toContain("departmentId");
    expect(schema).toContain("managerId");
    expect(schema).toContain("@default(PENDING_ASSIGNMENT)");
    expect(managedProfileMigrations).toContain('SET "entraManagerId" = "managerId"');
    expect(managedProfileMigrations).toContain('SET "managerId" = NULL');
    expect(managedProfileMigrations).toContain('ALTER COLUMN "status" SET DEFAULT \'PENDING_ASSIGNMENT\'');
  });

  it("préserve le nom Entra et ne permet de modifier que le nom géré", () => {
    const adminService = source("lib/admin-service.ts");
    const updateStart = adminService.indexOf("export async function updateManagedUserProfile");
    const mutationStart = adminService.indexOf("data: {", updateStart);
    const mutationEnd = adminService.indexOf("select:", mutationStart);
    const mutation = adminService.slice(mutationStart, mutationEnd);

    expect(adminService).toContain("entraDisplayName: true");
    expect(mutation).toContain("managedDisplayName: parsed.managedDisplayName");
    expect(mutation).toContain("name: parsed.managedDisplayName");
    expect(mutation).not.toContain("email:");
    expect(mutation).not.toContain("entraObjectId:");
  });

  it("exige un motif, historise chaque champ modifié et notifie les impacts de périmètre", () => {
    const adminService = source("lib/admin-service.ts");
    const schema = source("prisma/schema.prisma");

    expect(adminService).toContain("userProfileAdminSchema.parse(input)");
    expect(adminService).toContain("userProfileChange.create");
    expect(adminService).toContain("oldValue: profileJson(oldProfile[field])");
    expect(adminService).toContain("newValue: profileJson(newProfile[field])");
    expect(adminService).toContain("appendAuditLog(tx");
    expect(adminService).toContain('type: "ADMINISTRATIVE_ACTION"');
    expect(schema).toContain("model UserProfileChange");
    expect(schema).toContain('onDelete: Restrict');
    expect(managedProfileMigrations).toContain("user_profile_change_append_only");
  });

  it("protège le statut en attente et interdit le routage ticket hors file autorisée", () => {
    const auth = source("lib/server-auth.ts");
    const appLayout = source("app/(app)/layout.tsx");
    const waitingPage = source("app/pending-assignment/page.tsx");
    const ticketService = source("lib/ticket-service.ts");
    const route = source("app/api/admin/users/[id]/route.ts");

    expect(auth).toContain('user.status === "PENDING_ASSIGNMENT"');
    expect(appLayout).toContain('redirect("/pending-assignment")');
    expect(waitingPage).toContain("En attente d’affectation administrative");
    expect(ticketService).toContain("actor.authorizedQueueId");
    expect(ticketService).toContain("service.queueId !== actor.authorizedQueueId");
    expect(ticketService).toContain("canClaimTicket");
    expect(route).toContain('requireAdminAccess("FUNCTIONAL")');
    expect(route).toContain("updateManagedUserProfile");
  });

  it("borne la visibilité des agents à leur équipe active et à leur file autorisée", () => {
    const ticketService = source("lib/ticket-query-service.ts");
    const access = source("lib/access-control.ts");

    expect(ticketService).toContain("activeTeamQueueIds");
    expect(ticketService).toContain("authorizedQueueId === queueId");
    expect(access).toContain("subject.authorizedQueueId");
    expect(access).toContain("canManageQueue");
    expect(canViewTicket({
      id: "agent",
      authorizedQueueId: "queue-a",
      teamIds: ["team-a"],
      roles: [{ code: RoleCode.AGENT }],
    }, {
      requesterId: "requester",
      assignedToId: null,
      queueId: "queue-b",
      departmentId: "department",
      confidential: false,
      teamIds: ["team-a"],
    })).toBe(false);
  });

  it("reconnaît un administrateur fonctionnel en attente sans ouvrir l’espace normal", () => {
    expect(isPendingFunctionalAdministrator({
      status: "PENDING_ASSIGNMENT",
      roleAssignments: [{ role: { code: RoleCode.FUNCTIONAL_ADMIN }, scopeId: null }],
    } as never)).toBe(true);
    expect(source("lib/server-auth.ts")).toContain("requireAuthenticatedUser");
    expect(source("app/(app)/profile/page.tsx")).toContain("lecture seule");
  });
});
