import { NextResponse } from "next/server";
import type { TicketListDTO } from "@/contracts/ticket.dto";
import { errorResponse } from "@/lib/http";
import { toTicketDTO, toTicketDomain, toTicketListItemDTO } from "@/lib/mappers/ticket.mapper";
import { requirePermission } from "@/lib/server-auth";
import { listVisibleTicketsPage } from "@/lib/ticket-query-service";
import { createTicket } from "@/lib/ticket-service";
import { createTicketSchema, ticketListQuerySchema } from "@/lib/validation";

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
    const result = await listVisibleTicketsPage(actor, {
      status: parsed.status,
      priority: parsed.priority,
      scope: parsed.scope,
      sla: parsed.sla,
      departmentId: parsed.departmentId,
      queueId: parsed.queueId,
      dossierId: parsed.dossierId,
      missionId: parsed.missionId,
      query: parsed.q,
      sort: parsed.sort,
      cursor: parsed.cursor,
      page: parsed.page,
      pageSize: parsed.pageSize,
      take: parsed.take,
    });
    const response: TicketListDTO = {
      data: result.tickets.map(toTicketListItemDTO),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("ticket:create");
    const ticket = await createTicket(actor, createTicketSchema.parse(await request.json()));
    return NextResponse.json(toTicketDTO(toTicketDomain(ticket)), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
