import { NextResponse } from "next/server";
import { processOutboxBatch } from "@/lib/outbox";
import { errorResponse } from "@/lib/http";
import { readServerEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = readServerEnvironment().CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "Le secret outbox n’est pas configuré." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Job non autorisé." }, { status: 403 });
  try { return NextResponse.json({ success: true, result: await processOutboxBatch() }); }
  catch (error) { return errorResponse(error); }
}
