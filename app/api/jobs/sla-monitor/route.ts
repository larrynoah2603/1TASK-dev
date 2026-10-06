import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/lib/http";
import { runSlaMonitor } from "@/lib/sla-monitor";
import { readServerEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

function authorizeJob(request: Request) {
  const cronSecret = readServerEnvironment().CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return apiErrorResponse({
      message: "Le secret du moniteur SLA n’est pas configuré.",
      code: "CONFIGURATION_ERROR",
      status: 503,
    });
  }

  if (!authorization || authorization !== `Bearer ${cronSecret}`) {
    return apiErrorResponse({
      message: "Job non autorisé.",
      code: "ACCESS_DENIED",
      status: 403,
    });
  }

  return null;
}

async function run(request: Request) {
  const authError = authorizeJob(request);
  if (authError) return authError;

  try {
    const result = await runSlaMonitor();

    return NextResponse.json({
      success: true,
      result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** QStash uses POST; GET remains available for authenticated operational checks.
 * Both methods pass through the same explicit CRON_SECRET guard. */
export const GET = run;
export const POST = run;
