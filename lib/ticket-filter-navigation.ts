const TICKET_FILTER_KEYS = [
  "q",
  "scope",
  "status",
  "priority",
  "sla",
  "sort",
  "departmentId",
  "queueId",
  "dossierId",
  "missionId",
] as const;

function ticketFilterHref(pathname: string, params: URLSearchParams) {
  params.delete("page");
  params.delete("cursor");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildTicketFilterHref(
  pathname: string,
  currentSearch: string,
  values: Record<string, string | undefined>,
) {
  const next = new URLSearchParams(currentSearch);

  for (const key of TICKET_FILTER_KEYS) {
    const value = values[key]?.trim() ?? "";
    if (value) next.set(key, value);
    else next.delete(key);
  }

  return ticketFilterHref(pathname, next);
}

export function buildTicketViewHref(
  pathname: string,
  currentSearch: string,
  updates: { scope?: string | null; sla?: string | null },
) {
  const next = new URLSearchParams(currentSearch);

  if ("scope" in updates) {
    const scope = updates.scope?.trim() ?? "";
    if (scope && scope !== "all") next.set("scope", scope);
    else next.delete("scope");
  }

  if ("sla" in updates) {
    const sla = updates.sla?.trim() ?? "";
    if (sla) next.set("sla", sla);
    else next.delete("sla");
  }

  return ticketFilterHref(pathname, next);
}
