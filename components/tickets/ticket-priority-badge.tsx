import { PriorityBadge } from "@/components/status-badge";
import type { Priority } from "@prisma/client";

export function TicketPriorityBadge({ priority }: { priority: Priority }) {
  return <PriorityBadge priority={priority} />;
}
