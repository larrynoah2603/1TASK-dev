-- Additive catalog confidentiality configuration. Existing services remain disabled.
ALTER TABLE "ServiceCatalogItem"
  ADD COLUMN "allowConfidentialTickets" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "confidentialPrimaryRecipientId" TEXT,
  ADD COLUMN "confidentialSubstituteId" TEXT,
  ADD COLUMN "confidentialityVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "ConfidentialDelegation" (
  "id" TEXT NOT NULL,
  "serviceCatalogItemId" TEXT NOT NULL,
  "primaryRecipientId" TEXT NOT NULL,
  "substituteId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "activatedById" TEXT NOT NULL,
  "revokedById" TEXT,
  "actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "reason" TEXT NOT NULL,
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfidentialDelegation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TicketAccess" ADD COLUMN "delegationId" TEXT;
CREATE INDEX "ServiceCatalogItem_confidentialPrimaryRecipientId_idx" ON "ServiceCatalogItem"("confidentialPrimaryRecipientId");
CREATE INDEX "ServiceCatalogItem_confidentialSubstituteId_idx" ON "ServiceCatalogItem"("confidentialSubstituteId");
CREATE INDEX "ConfidentialDelegation_serviceCatalogItemId_startsAt_endsAt_revokedAt_idx" ON "ConfidentialDelegation"("serviceCatalogItemId", "startsAt", "endsAt", "revokedAt");
CREATE INDEX "ConfidentialDelegation_substituteId_startsAt_endsAt_revokedAt_idx" ON "ConfidentialDelegation"("substituteId", "startsAt", "endsAt", "revokedAt");
CREATE INDEX "TicketAccess_delegationId_idx" ON "TicketAccess"("delegationId");
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_confidentialPrimaryRecipientId_fkey" FOREIGN KEY ("confidentialPrimaryRecipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_confidentialSubstituteId_fkey" FOREIGN KEY ("confidentialSubstituteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfidentialDelegation" ADD CONSTRAINT "ConfidentialDelegation_serviceCatalogItemId_fkey" FOREIGN KEY ("serviceCatalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfidentialDelegation" ADD CONSTRAINT "ConfidentialDelegation_primaryRecipientId_fkey" FOREIGN KEY ("primaryRecipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfidentialDelegation" ADD CONSTRAINT "ConfidentialDelegation_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfidentialDelegation" ADD CONSTRAINT "ConfidentialDelegation_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfidentialDelegation" ADD CONSTRAINT "ConfidentialDelegation_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAccess" ADD CONSTRAINT "TicketAccess_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "ConfidentialDelegation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
