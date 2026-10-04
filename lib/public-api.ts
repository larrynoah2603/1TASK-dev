import { withApiObservability } from "@/lib/http";
import { errorResponse } from "@/lib/http";
import { requireProductCapability } from "@/lib/product-policy.server";

export const PUBLIC_API_VERSION = "1";

type PublicApiHandler<Context> = (request: Request, context: Context) => Promise<Response>;

/** Common transport policy for every /api/v1 endpoint. */
export function withPublicApiV1<Context>(route: string, handler: PublicApiHandler<Context>): PublicApiHandler<Context> {
  const observed = withApiObservability(route, handler);
  return async (request, context) => {
    let response: Response;
    try {
      requireProductCapability("publicApiV1");
      response = await observed(request, context);
    } catch (error) {
      response = errorResponse(error);
    }
    response.headers.set("X-API-Version", PUBLIC_API_VERSION);
    response.headers.append("Vary", "X-1TASK-Client");
    return response;
  };
}
