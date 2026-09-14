import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  requirePermission,
  requireSessionUserContext,
} from "@/lib/server-auth";
import { listVisibleTicketsPage, createTicket } from "@/lib/ticket-service";
import {
  createTicketSchema,
  ticketListQuerySchema,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("ticket:read");

    const url = new URL(request.url);

    const parsed = ticketListQuerySchema.parse({
      status: url.searchParams.get("status") || undefined,
      priority: url.searchParams.get("priority") || undefined,
      scope: url.searchParams.get("scope") || undefined,
      sla: url.searchParams.get("sla") || undefined,
      departmentId: url.searchParams.get("departmentId") || undefined,
      queueId: url.searchParams.get("queueId") || undefined,
      dossierId: url.searchParams.get("dossierId") || undefined,
      missionId: url.searchParams.get("missionId") || undefined,
      q: url.searchParams.get("q") || undefined,
      sort: url.searchParams.get("sort") || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
      page: url.searchParams.get("page") || undefined,
      pageSize: url.searchParams.get("pageSize") || undefined,
      take: url.searchParams.get("take") || undefined,
    });
    const MAX_PAGE_SIZE = 100;
    const ticketPage = await listVisibleTicketsPage(actor, {
      status: parsed.status,
      priority: parsed.priority,
      scope: parsed.scope,
      sla: parsed.sla,
      departmentId: parsed.departmentId,
      queueId: parsed.queueId,
      dossierId: parsed.dossierId,
      missionId: parsed.missionId,
      query: parsed.q,
      take: parsed.take,
      sort: parsed.sort,
      cursor: parsed.cursor,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });

    const response = NextResponse.json(ticketPage.tickets);
    response.headers.set("X-Has-More", String(ticketPage.hasMore));
    if (ticketPage.nextCursor) response.headers.set("X-Next-Cursor", ticketPage.nextCursor);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}


export async function POST(request: Request) {
  try {
    const actor = await requirePermission("ticket:create");

    const body = createTicketSchema.parse(
      await request.json()
    );

    const ticket = await createTicket(actor, body);

    return NextResponse.json(ticket, {
      status: 201,
    });

  } catch (error) {
    return errorResponse(error);
  }
}
