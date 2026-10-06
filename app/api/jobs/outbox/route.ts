import { NextResponse } from "next/server";
import { processOutboxBatch } from "@/lib/outbox";
import { httpErrorResponse, errorResponse } from "@/lib/http";
import { getJobAuthorizationFailure } from "@/lib/job-auth";

export const dynamic = "force-dynamic";

async function run(request: Request) {
  const authError = getJobAuthorizationFailure(
    request,
    "Le secret outbox n’est pas configuré.",
  );
  if (authError) return httpErrorResponse(authError.message, authError.status);
  try { return NextResponse.json({ success: true, result: await processOutboxBatch() }); }
  catch (error) { return errorResponse(error); }
}

export const GET = run;
export const POST = run;
