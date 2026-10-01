import { describe, expect, it } from "vitest";
import { UserStatus } from "@prisma/client";
import { recipientIsEligible, CONFIDENTIAL_DELEGATED_ACTIONS } from "@/lib/confidential-ticket-service";
import { catalogAdminSchema, createTicketSchema } from "@/lib/validation";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cuid = "clz123456789012345678901";
const baseCatalog = { code: "SALARY-COMPLAINT", name: "Salary complaint", ticketType: "SERVICE_REQUEST", category: "Complaint", keywords: [], queueId: cuid, priorityDefault: "MEDIUM", slaId: cuid, isActive: true, reason: "Business configuration" } as const;

describe("catalog confidentiality", () => {
  it("is disabled by default and requires a primary recipient when enabled", () => {
    expect(catalogAdminSchema.parse(baseCatalog).allowConfidentialTickets).toBe(false);
    expect(catalogAdminSchema.safeParse({ ...baseCatalog, allowConfidentialTickets: true }).success).toBe(false);
    expect(catalogAdminSchema.safeParse({ ...baseCatalog, allowConfidentialTickets: true, confidentialPrimaryRecipientId: cuid }).success).toBe(true);
  });
  it("rejects disabled application accounts", () => {
    expect(recipientIsEligible({ status: UserStatus.ACTIVE, administrativelyDisabled: false })).toBe(true);
    expect(recipientIsEligible({ status: UserStatus.DISABLED, administrativelyDisabled: false })).toBe(false);
    expect(recipientIsEligible({ status: UserStatus.ACTIVE, administrativelyDisabled: true })).toBe(false);
  });
  it("accepts an explicit preview configuration version", () => {
    expect(createTicketSchema.parse({ serviceCatalogItemId: cuid, title: "Salary concern", description: "A sufficiently detailed description", confidential: true, confidentialityVersion: 3 }).confidentialityVersion).toBe(3);
  });
  it("defines limited operational actions", () => {
    expect(CONFIDENTIAL_DELEGATED_ACTIONS).toEqual(expect.arrayContaining(["VIEW", "COMMENT", "STATUS", "ATTACHMENT", "TRANSFER"]));
  });
  it("keeps confidential creation named and avoids queue broadcasts/assignment", () => {
    const source = readFileSync(join(process.cwd(), "lib/ticket-service.ts"), "utf8");
    expect(source).toContain("!parsed.confidential && routingMode");
    expect(source).toContain("confidentialRecipientId");
    expect(source).toContain("ticketAccess.createMany");
  });
  it("expires delegation-derived visibility in lists and direct access", () => {
    const query = readFileSync(join(process.cwd(), "lib/ticket-query-service.ts"), "utf8");
    const access = readFileSync(join(process.cwd(), "lib/ticket-access.ts"), "utf8");
    expect(query).toContain("delegation: { startsAt:");
    expect(access).toContain("entry.delegation.endsAt > new Date()");
  });
});
