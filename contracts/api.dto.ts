export type ApiClientDTO = "web" | "mobile" | "partner";

export interface ApiDiscoveryDTO {
  version: "v1";
  status: "available";
  authentication: {
    active: "sessionCookie";
    planned: ["oauth2Bearer"];
  };
  clients: ApiClientDTO[];
  documentation: "/docs/api/openapi.yaml";
}
