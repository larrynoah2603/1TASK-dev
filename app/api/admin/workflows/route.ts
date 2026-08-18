import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listWorkflowDefinitions, publishWorkflowDefinition, saveWorkflowDefinition } from "@/lib/workflow-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { workflowDefinitionSchema } from "@/lib/validation";

export async function GET() {
  try {
    const actor = await requireSessionUserContext();
    return NextResponse.json({ workflows: await listWorkflowDefinitions(actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const workflow = await saveWorkflowDefinition(actor, workflowDefinitionSchema.parse(await request.json()));
    return NextResponse.json(workflow);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const body = await request.json() as { code?: string };
    if (!body.code?.trim()) return NextResponse.json({ error: "Le code du workflow est obligatoire." }, { status: 422 });
    return NextResponse.json(await publishWorkflowDefinition(actor, body.code));
  } catch (error) {
    return errorResponse(error);
  }
}
