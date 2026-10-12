import type { ReactNode } from "react";
import { Search } from "lucide-react";

type FilterBarProps = { search?: string; searchPlaceholder?: string; onSearch?: (value: string) => void; children?: ReactNode; actions?: ReactNode; className?: string };

export function FilterBar({ search, searchPlaceholder = "Rechercher…", onSearch, children, actions, className = "" }: FilterBarProps) {
  return <div className={`ui-filter-bar ${className}`} role="search"><label className="ui-filter-search"><Search aria-hidden="true" /><input type="search" value={search} onChange={(event) => onSearch?.(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} /></label>{children ? <div className="ui-filter-controls">{children}</div> : null}{actions ? <div className="ui-filter-actions">{actions}</div> : null}</div>;
}
export type { FilterBarProps };
export default FilterBar;
