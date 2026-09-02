import { NextResponse } from "next/server";
import { runSlaMonitor } from "@/lib/sla-monitor";


export const dynamic = "force-dynamic";


function authorizeJob(request: Request) {
  const expected = process.env.CRON_SECRET;

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



export async function POST(
  request: Request,
) {
  const authError =
    authorizeJob(request);


  if (authError) {
    return NextResponse.json(
      {
        error: authError.error,
      },
      {
        status: authError.status,
      },
    );
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

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Échec du moniteur SLA.",
      },
      {
        status: 500,
      },
    );
  }
}