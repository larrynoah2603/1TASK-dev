import { UserStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/domain-error";

export const CONFIDENTIAL_DELEGATED_ACTIONS = ["VIEW", "COMMENT", "REPLY", "PROCESS", "STATUS", "ATTACHMENT", "ASSIGN", "TRANSFER", "CLOSE"] as const;
export type ConfidentialDelegatedAction = typeof CONFIDENTIAL_DELEGATED_ACTIONS[number];

const recipientSelect = { id: true, name: true, email: true, status: true, administrativelyDisabled: true } as const;

export function recipientIsEligible(user: { status: UserStatus; administrativelyDisabled: boolean } | null | undefined) {
  return Boolean(user && user.status === UserStatus.ACTIVE && !user.administrativelyDisabled);
}

export async function resolveConfidentialRecipient(
  serviceId: string,
  now = new Date(),
  client: Pick<typeof prisma, "serviceCatalogItem" | "confidentialDelegation"> = prisma,
) {
  const service = await client.serviceCatalogItem.findUnique({
    where: { id: serviceId },
    select: {
      id: true, isActive: true, allowConfidentialTickets: true, confidentialityVersion: true,
      confidentialPrimaryRecipient: { select: recipientSelect },
      confidentialSubstitute: { select: recipientSelect },
    },
  });
  if (!service || !service.isActive || !service.allowConfidentialTickets) {
    throw new DomainError("Ce service ne permet pas les tickets confidentiels.", 422);
  }
  if (!service.confidentialPrimaryRecipient || !recipientIsEligible(service.confidentialPrimaryRecipient)) {
    throw new DomainError("Le destinataire confidentiel principal est indisponible. Modifiez la sélection ou créez un ticket standard.", 422);
  }
  const delegation = await client.confidentialDelegation.findFirst({
    where: {
      serviceCatalogItemId: service.id,
      primaryRecipientId: service.confidentialPrimaryRecipient.id,
      substituteId: service.confidentialSubstitute?.id ?? "__none__",
      startsAt: { lte: now }, revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: { substitute: { select: recipientSelect } },
    orderBy: { startsAt: "desc" },
  });
  if (delegation && !recipientIsEligible(delegation.substitute)) {
    throw new DomainError("Le remplaçant confidentiel actif n’est plus autorisé à utiliser l’application.", 422);
  }
  const recipient = delegation?.substitute ?? service.confidentialPrimaryRecipient;
  return {
    service,
    recipient,
    delegation: delegation ?? null,
    version: service.confidentialityVersion,
  };
}

export const activeDelegatedTicketAccessWhere = (userId: string, now = new Date()): Prisma.TicketAccessWhereInput => ({
  userId,
  OR: [
    { delegationId: null },
    { delegation: { startsAt: { lte: now }, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } },
  ],
});

export async function confidentialRecipientHasProcessingCapability(userId: string) {
  return Boolean(await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.ACTIVE, administrativelyDisabled: false, roleAssignments: { some: { role: { permissions: { some: { permission: { code: "ticket:update" } } } } } } },
    select: { id: true },
  }));
}
