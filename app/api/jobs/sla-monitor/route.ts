import { NextResponse } from "next/server";
import { httpErrorResponse, errorResponse } from "@/lib/http";
import { runSlaMonitor } from "@/lib/sla-monitor";
import { getJobAuthorizationFailure } from "@/lib/job-auth";


export const dynamic = "force-dynamic";


async function run(
  request: Request,
) {
  const authError = getJobAuthorizationFailure(
    request,
    "Le secret du moniteur SLA n’est pas configuré.",
  );

  if (authError) {
    return httpErrorResponse(authError.message, authError.status);
  }


  try {
    const result =
      await runSlaMonitor();


    return NextResponse.json({
      success: true,
      result,
      executedAt:
        new Date().toISOString(),
    });


  } catch (error) {
    return errorResponse(error);
  }
}

/** External schedulers such as QStash use POST; GET remains available for
 * authenticated operational checks. Both methods require the same bearer secret. */
export const GET = run;
export const POST = run;
