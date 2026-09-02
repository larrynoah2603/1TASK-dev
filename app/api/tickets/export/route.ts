import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { exportVisibleTickets } from "@/lib/export-service";
import { requirePermission } from "@/lib/server-auth";
import { ticketListQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  try {
    const actor = await requirePermission(
      "ticket:export",
    );


    const url = new URL(request.url);


    const options = ticketListQuerySchema.parse({
      status:
        url.searchParams.get("status") || undefined,

      priority:
        url.searchParams.get("priority") || undefined,

      scope:
        url.searchParams.get("scope") || undefined,

      sla:
        url.searchParams.get("sla") || undefined,

      departmentId:
        url.searchParams.get("departmentId") || undefined,

      queueId:
        url.searchParams.get("queueId") || undefined,

      q:
        url.searchParams.get("q") || undefined,

      take:
        url.searchParams.get("take") || undefined,
    });


    const csv = await exportVisibleTickets(
      actor,
      {
        status: options.status,
        priority: options.priority,
        scope: options.scope,
        sla: options.sla,
        departmentId: options.departmentId,
        queueId: options.queueId,
        query: options.q,
        take: options.take,
      },
    );


    return new NextResponse(csv, {
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          'attachment; filename="tickets-autorises.csv"',

        "Cache-Control":
          "no-store",
      },
    });


  } catch (error) {
    return errorResponse(error);
  }
}