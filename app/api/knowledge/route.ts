import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { addWorklog } from "@/lib/production-service";
import { requirePermission } from "@/lib/server-auth";
import { worklogSchema } from "@/lib/validation";


export async function POST(
  request: Request,
) {

  try {

    const actor = await requirePermission("worklog:create");


    const worklog =
      await addWorklog(
        actor,
        worklogSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      worklog,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}