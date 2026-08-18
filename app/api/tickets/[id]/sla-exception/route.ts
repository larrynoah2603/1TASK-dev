import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { addSlaException } from "@/lib/ticket-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { slaExceptionSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSessionUserContext();
    const { id } = await context.params;
    const exception = await addSlaException(actor, id, slaExceptionSchema.parse(await request.json()));
    return NextResponse.json(exception, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
