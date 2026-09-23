import type { ReactNode } from "react";

type DataTableColumn<T> = { key: string; header: ReactNode; cell?: (row: T) => ReactNode; sortable?: boolean; className?: string };

type DataTableProps<T> = { columns: DataTableColumn<T>[]; data: T[]; getRowKey?: (row: T, index: number) => string; sortKey?: string; sortDirection?: "asc" | "desc"; onSort?: (key: string) => void; page?: number; pageCount?: number; onPageChange?: (page: number) => void; loading?: boolean; emptyState?: ReactNode; caption?: string; className?: string };

export function DataTable<T>({ columns, data, getRowKey, sortKey, sortDirection = "asc", onSort, page = 1, pageCount = 1, onPageChange, loading = false, emptyState = "Aucun résultat", caption = "Tableau de données", className = "" }: DataTableProps<T>) {
  return <div className={`ui-data-table ${className}`}>
    <div className="ui-data-table-scroll"><table><caption className="ui-sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} className={column.className} scope="col">{column.sortable ? <button type="button" className="ui-data-table-sort" onClick={() => onSort?.(column.key)} aria-label={`Trier par ${String(column.header)}`} aria-pressed={sortKey === column.key}>{column.header}<span aria-hidden="true">{sortKey === column.key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span></button> : column.header}</th>)}</tr></thead><tbody>{loading ? <DataTableSkeleton columnCount={columns.length} /> : data.length ? data.map((row, index) => <tr key={getRowKey?.(row, index) ?? index}>{columns.map((column) => <td key={column.key} className={column.className}>{column.cell ? column.cell(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}</td>)}</tr>) : <tr><td colSpan={columns.length}><div className="ui-data-table-empty">{emptyState}</div></td></tr>}</tbody></table></div>
    {pageCount > 1 ? <nav className="ui-pagination" aria-label="Pagination"><button type="button" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>Précédent</button><span>Page {page} sur {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => onPageChange?.(page + 1)}>Suivant</button></nav> : null}
  </div>;
}

function DataTableSkeleton({ columnCount }: { columnCount: number }) { return <>{Array.from({ length: 5 }, (_, row) => <tr key={row}>{Array.from({ length: columnCount }, (_, column) => <td key={column}><span className="ui-table-skeleton" /></td>)}</tr>)}</>; }
export type { DataTableColumn, DataTableProps };
export default DataTable;
