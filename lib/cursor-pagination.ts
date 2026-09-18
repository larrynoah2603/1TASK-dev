export type CursorPageOptions = { cursor?: string; pageSize?: number };

export type CursorPage<T> = {
  items: T[];
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export function normalizePageSize(value: number | undefined, fallback = 50, maximum = 100) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(1, Math.trunc(value)));
}

export function toCursorPage<T extends { id: string }>(rows: T[], pageSize: number): CursorPage<T> {
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  return {
    items,
    pageSize,
    hasMore,
    nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
  };
}
