export interface PaginationDTO {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  nextCursor: string | null;
}
