import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`ui-button ui-button-${variant} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card ${className}`} {...props} />;
}

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "info" | "success" | "warning" | "danger"; className?: string }) {
  return <span className={`ui-badge ui-badge-${tone} ${className}`}>{children}</span>;
}

export function Progress({ value, tone = "brand", label }: { value: number; tone?: "brand" | "success" | "warning" | "danger"; label?: string }) {
  const bounded = Math.min(100, Math.max(0, value));
  return <div className="ui-progress" role="progressbar" aria-valuenow={bounded} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span className={`ui-progress-fill ui-progress-${tone}`} style={{ width: `${bounded}%` }} /></div>;
}

export const SLAProgress = Progress;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "success" | "warning" | "danger" }) {
  return <Badge tone={tone} className="ui-status-badge"><span className="ui-status-dot" aria-hidden="true" />{children}</Badge>;
}

export function Timeline({ items }: { items: Array<{ title: string; description?: string; meta?: string }> }) {
  return <ol className="ui-timeline">{items.map((item, index) => <li key={`${item.title}-${index}`}><span className="ui-timeline-marker" aria-hidden="true" /><div><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}{item.meta ? <small>{item.meta}</small> : null}</div></li>)}</ol>;
}

export function Table({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return <div className={`ui-table-wrap ${className}`}><table className="ui-table" aria-label={label}>{children}</table></div>;
}

export function Modal({ title, children, footer, onClose }: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  return <div className="ui-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title"><header><h2 id="ui-modal-title">{title}</h2><button type="button" onClick={onClose} aria-label="Fermer">×</button></header><div className="ui-modal-body">{children}</div>{footer ? <footer>{footer}</footer> : null}</section></div>;
}

export function ErrorState({ title = "Une erreur est survenue", description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div className="ui-error-state" role="alert"><div aria-hidden="true">!</div><h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="ui-empty-state"><div className="ui-empty-icon" aria-hidden="true">+</div><h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</div>;
}

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`ui-skeleton ${className}`} aria-hidden="true" />;
}

export function SearchInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`ui-search ${className}`}><span aria-hidden="true">⌕</span><input type="search" {...props} /></label>;
}
