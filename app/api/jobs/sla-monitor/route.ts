import { NextResponse } from "next/server";
import { runSlaMonitor } from "@/lib/sla-monitor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected) {
    return NextResponse.json({ error: "Le secret du moniteur SLA n’est pas configuré." }, { status: 503 });
  }
  if (!authorization) {
    return NextResponse.json({ error: "Authentification du job requise." }, { status: 401 });
  }
  if (authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Job non autorisé." }, { status: 403 });
  }
  try {
    return NextResponse.json(await runSlaMonitor());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Échec du moniteur SLA." }, { status: 500 });
  }
}
