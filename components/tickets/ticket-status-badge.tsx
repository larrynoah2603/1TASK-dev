import { StatusBadge } from "@/components/status-badge";
import type { TicketStatus } from "@prisma/client";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <StatusBadge status={status} />;
}
