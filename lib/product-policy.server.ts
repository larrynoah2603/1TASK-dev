import "server-only";
import { readServerEnvironment } from "@/lib/env";
import {
  assertProductCapability,
  resolveProductCapabilities,
  type ProductCapability,
  type ProductCapabilities,
} from "@/lib/product-policy";

export function getProductCapabilities(): ProductCapabilities {
  return resolveProductCapabilities(readServerEnvironment().PRODUCT_PROFILE);
}

export function requireProductCapability(capability: ProductCapability): void {
  assertProductCapability(getProductCapabilities(), capability);
}
