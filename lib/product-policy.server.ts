import {
  assertProductCapability,
  resolveProductCapabilities,
  type ProductCapability,
  type ProductCapabilities,
} from "@/lib/product-policy";

export function getProductCapabilities(): ProductCapabilities {
  // Startup validation owns rejection of unknown values. Keeping this lookup
  // independent from unrelated secrets also makes dormant guards safe at
  // import/request boundaries where only the profile is needed.
  return resolveProductCapabilities(process.env.PRODUCT_PROFILE === "v1" ? "v1" : "full");
}

export function requireProductCapability(capability: ProductCapability): void {
  assertProductCapability(getProductCapabilities(), capability);
}
