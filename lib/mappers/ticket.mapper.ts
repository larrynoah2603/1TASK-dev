import type { TicketDTO } from "@/contracts/ticket.dto";


export function toTicketDTO(
 ticket: Ticket
): TicketDTO {

return {

 id: ticket.id,
 reference: ticket.reference,
 title: ticket.title,
 description: ticket.description,
 status: ticket.status,
 priority: ticket.priority,

 createdAt: ticket.createdAt.toISOString(),
 updatedAt: ticket.updatedAt.toISOString()

};

}