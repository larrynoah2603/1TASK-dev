import { NextResponse } from "next/server";
import { httpErrorResponse, errorResponse } from "@/lib/http";
import { runSlaMonitor } from "@/lib/sla-monitor";
import { readServerEnvironment } from "@/lib/env";


export const dynamic = "force-dynamic";


function authorizeJob(request: Request) {
  const expected = readServerEnvironment().CRON_SECRET;

  const authorization =
    request.headers.get("authorization");


  if (!expected) {
    return {
      error:
        "Le secret du moniteur SLA n’est pas configuré.",
      status: 503,
    };
  }


  if (!authorization) {
    return {
      error:
        "Authentification du job requise.",
      status: 401,
    };
  }


  if (authorization !== `Bearer ${expected}`) {
    return {
      error:
        "Job non autorisé.",
      status: 403,
    };
  }


  return null;
}



async function run(
  request: Request,
) {
  const authError =
    authorizeJob(request);


  if (authError) {
    return httpErrorResponse(authError.error, authError.status);
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

/** Vercel Cron invokes routes with GET. POST remains supported for existing
 * operational callers and both methods use the same bearer authentication. */
export const GET = run;
export const POST = run;
