import type { TicketDetailDomain, TicketDomain } from "@/lib/domain/ticket";
import type { TicketListItemDomain } from "@/lib/domain/ticket-list";

export type JsonDTO<T> = T extends Date
  ? string
  : T extends readonly (infer Item)[]
    ? JsonDTO<Item>[]
    : T extends object
      ? { [Key in keyof T]: JsonDTO<T[Key]> }
      : T;

/** Stable scalar ticket representation used by create/update API responses. */
export type TicketDTO = JsonDTO<TicketDomain>;

/** Stable ticket list representation; dates are serialized at the API boundary. */
export type TicketListItemDTO = JsonDTO<TicketListItemDomain>;

/** Stable detailed representation including the relations required by clients. */
export type TicketDetailDTO = JsonDTO<TicketDetailDomain>;
