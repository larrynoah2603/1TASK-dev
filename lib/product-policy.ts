import type { ServerEnvironment } from "@/lib/env";

export type ProductProfile = ServerEnvironment["PRODUCT_PROFILE"];

/** Public, serializable product capabilities. This object never contains configuration secrets. */
export type ProductCapabilities = Readonly<{
  coreTickets: boolean;
  audit: boolean;
  slaCalendars: boolean;
  slaMonitoring: boolean;
  inAppNotifications: boolean;
  myAssets: boolean;
  assetAdministration: boolean;
  productionPortfolio: boolean;
  knowledge: boolean;
  confidentialTicketCreation: boolean;
  attachmentUploads: boolean;
  autoAssignment: boolean;
  manualAssignment: boolean;
  claim: boolean;
  workflowDefinitions: boolean;
  publicApiV1: boolean;
  pushNotifications: boolean;
  redisCache: boolean;
  externalOutboxDelivery: boolean;
  externalEmailDelivery: boolean;
}>;

const fullCapabilities: ProductCapabilities = Object.freeze({
  coreTickets: true,
  audit: true,
  slaCalendars: true,
  slaMonitoring: true,
  inAppNotifications: true,
  myAssets: true,
  assetAdministration: true,
  productionPortfolio: true,
  knowledge: true,
  confidentialTicketCreation: true,
  attachmentUploads: true,
  autoAssignment: true,
  manualAssignment: true,
  claim: true,
  workflowDefinitions: true,
  publicApiV1: true,
  pushNotifications: true,
  redisCache: true,
  externalOutboxDelivery: true,
  externalEmailDelivery: true,
});

const v1Capabilities: ProductCapabilities = Object.freeze({
  ...fullCapabilities,
  productionPortfolio: false,
  knowledge: false,
  confidentialTicketCreation: false,
  attachmentUploads: false,
  autoAssignment: false,
  workflowDefinitions: false,
  publicApiV1: false,
  pushNotifications: true,
  redisCache: false,
  externalOutboxDelivery: false,
  externalEmailDelivery: false,
});

/** The single profile-to-capability resolver, kept pure for server and UI tests. */
export function resolveProductCapabilities(profile: ProductProfile): ProductCapabilities {
  return profile === "v1" ? v1Capabilities : fullCapabilities;
}

export type ProductCapability = keyof ProductCapabilities;

export class ProductCapabilityDisabledError extends Error {
  readonly statusCode = 403;
  readonly code = "FEATURE_DISABLED";
  readonly context: { capability: ProductCapability };

  constructor(capability: ProductCapability) {
    super("Cette fonctionnalité n’est pas disponible avec le profil produit actif.");
    this.name = "ProductCapabilityDisabledError";
    this.context = { capability };
  }
}

/** Use in addition to authentication/scope checks, before disabled mutation logic runs. */
export function assertProductCapability(
  capabilities: ProductCapabilities,
  capability: ProductCapability,
): void {
  if (!capabilities[capability]) throw new ProductCapabilityDisabledError(capability);
}

/** Queue configuration remains stored in V1, but cannot be enabled or overwritten there. */
export function resolveQueueAutoAssignmentSetting(
  capabilities: ProductCapabilities,
  requested: boolean,
  existing?: boolean,
): boolean {
  if (!capabilities.autoAssignment) {
    if (requested) assertProductCapability(capabilities, "autoAssignment");
    return existing ?? false;
  }
  return requested;
}
