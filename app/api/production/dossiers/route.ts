import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { createDossier, listDossiersForViewer } from "@/lib/production-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { dossierSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const query = new URL(request.url).searchParams.get("q") ?? undefined;
    return NextResponse.json({ dossiers: await listDossiersForViewer(actor, query) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const dossier = await createDossier(actor, dossierSchema.parse(await request.json()));
    return NextResponse.json(dossier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
