import { NextResponse } from "next/server";
import type { ApiDiscoveryDTO } from "@/contracts/api.dto";
import { withPublicApiV1 } from "@/lib/public-api";
import { requireSessionUserContext } from "@/lib/server-auth";

async function discoverApi() {
  await requireSessionUserContext();
  const response: ApiDiscoveryDTO = {
    version: "v1",
    status: "available",
    authentication: { active: "sessionCookie", planned: ["oauth2Bearer"] },
    clients: ["web", "mobile", "partner"],
    documentation: "/docs/api/openapi.yaml",
  };
  return NextResponse.json(response);
}

export const GET = withPublicApiV1("/api/v1", discoverApi);
