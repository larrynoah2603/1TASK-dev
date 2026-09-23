import type { HTMLAttributes, ReactNode } from "react";

import { Badge, Button, Card, LoadingSkeleton, Progress, SearchInput, StatusBadge, Timeline } from "./primitives";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`ds-page-header ${className}`}>
      <div className="ds-page-header-copy">
        {eyebrow ? <p className="ds-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="ds-page-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="ds-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="ds-section-heading">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="ds-section-heading-action">{action}</div> : null}
    </div>
  );
}

export function Panel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`ds-panel ${className}`}>
      {title || description || action ? (
        <div className="ds-panel-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      <div className="ds-panel-content">{children}</div>
    </Card>
  );
}

export function KpiCard({ label, value, detail, trend, tone = "info", href }: { label: string; value: string | number; detail?: string; trend?: string; tone?: Tone; href?: string }) {
  const content = (
    <>
      <div className="ds-kpi-topline"><span>{label}</span><span className={`ds-kpi-indicator ds-kpi-indicator-${tone}`} aria-hidden="true" /></div>
      <strong>{value}</strong>
      <div className="ds-kpi-footer">{detail ? <span>{detail}</span> : <span />}{trend ? <Badge tone={tone}>{trend}</Badge> : null}</div>
    </>
  );

  return href ? <a className="ds-kpi-card ds-kpi-card-link" href={href}>{content}</a> : <div className="ds-kpi-card">{content}</div>;
}

export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <StatusBadge tone={tone}>{children}</StatusBadge>;
}

export function SlaStatus({ value, tone = "success", label = "SLA" }: { value: number; tone?: "brand" | "success" | "warning" | "danger"; label?: string }) {
  return <div className="ds-sla-status"><div className="ds-sla-label"><span>{label}</span><strong>{value}%</strong></div><Progress value={value} tone={tone} label={`${label} ${value}%`} /></div>;
}

export function FilterBar({ searchPlaceholder = "Rechercher…", searchValue, onSearch, filters, actions, className = "" }: { searchPlaceholder?: string; searchValue?: string; onSearch?: (value: string) => void; filters?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`ds-filter-bar ${className}`}>
      <SearchInput aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={searchValue} onChange={(event) => onSearch?.(event.target.value)} />
      {filters ? <div className="ds-filter-controls">{filters}</div> : null}
      {actions ? <div className="ds-filter-actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = "○" }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="ds-empty-state"><div className="ds-empty-icon" aria-hidden="true">{icon}</div><h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</div>;
}

export function DataTableShell({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ds-data-table-shell ${className}`} {...props}>{children}</div>;
}

export function StatCard({ label, value, detail, tone = "info", className = "" }: { label: string; value: string | number; detail?: string; tone?: Tone; className?: string }) {
  return <article className={`ds-stat-card ds-stat-card-${tone} ${className}`}><div className="ds-stat-card-label">{label}</div><strong className="ds-stat-card-value">{value}</strong>{detail ? <p className="ds-stat-card-detail">{detail}</p> : null}</article>;
}

export function ChartCard({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <Card className={`ds-chart-card ${className}`}><div className="ds-chart-card-header"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action ? <div>{action}</div> : null}</div><div className="ds-chart-card-content">{children}</div></Card>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <LoadingSkeleton className={`ds-skeleton ${className}`} />;
}

export { Badge, Button, Card, LoadingSkeleton, Progress, SearchInput, StatusBadge, Timeline };
export type { Tone };
