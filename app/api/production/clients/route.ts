import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  createClientAccount,
  listClientAccounts,
} from "@/lib/production-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { clientAccountSchema } from "@/lib/validation";


function requirePermission(
  actor: Awaited<ReturnType<typeof requireSessionUserContext>>,
  permission: string,
) {

  const permissions =
    actor.roleAssignments.flatMap(
      (assignment) =>
        assignment.role.permissions.map(
          (item) => item.permission.code,
        ),
    );


  if (!permissions.includes(permission)) {
    throw new Error(
      "Permission insuffisante.",
    );
  }
}



export async function GET(
  request: Request,
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "portfolio:read",
    );


    const query =
      new URL(request.url)
        .searchParams
        .get("q")
        ?? undefined;


    return NextResponse.json({
      clients:
        await listClientAccounts(
          actor,
          query,
        ),
    });


  } catch (error) {

    return errorResponse(error);

  }
}



export async function POST(
  request: Request,
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "portfolio:manage",
    );


    const client =
      await createClientAccount(
        actor,
        clientAccountSchema.parse(
          await request.json(),
        ),
      );


    return NextResponse.json(
      client,
      {
        status: 201,
      },
    );


  } catch (error) {

    return errorResponse(error);

  }
}