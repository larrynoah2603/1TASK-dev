import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  getManagedUserProfile,
  updateManagedUserProfile,
} from "@/lib/admin-service";
import { requireAdminAccess } from "@/lib/server-auth";


export const dynamic = "force-dynamic";


export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminAccess(
      "SECURITY",
    );


    const { id } = await context.params;


    const payload = await request.json();


    return NextResponse.json(
      await updateManagedUserProfile(
        actor,
        id,
        payload,
      ),
    );


  } catch (error) {
    return errorResponse(error);
  }
}



export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminAccess(
      "FUNCTIONAL",
    );


    const { id } = await context.params;


    return NextResponse.json(
      await getManagedUserProfile(
        actor,
        id,
      ),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );


  } catch (error) {
    return errorResponse(error);
  }
}