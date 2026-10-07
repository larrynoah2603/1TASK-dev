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

  // A filter change invalidates both offset and cursor positions.
  next.delete("page");
  next.delete("cursor");

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildTicketQuickViewHref(
  pathname: string,
  currentSearch: string,
  values: { scope?: string; sla?: string },
) {
  const next = new URLSearchParams(currentSearch);

  for (const [key, value] of Object.entries(values)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }

  next.delete("page");
  next.delete("cursor");

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
