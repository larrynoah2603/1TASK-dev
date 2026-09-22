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

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="ui-empty-state"><div className="ui-empty-icon" aria-hidden="true">+</div><h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</div>;
}

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`ui-skeleton ${className}`} aria-hidden="true" />;
}

export function SearchInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`ui-search ${className}`}><span aria-hidden="true">⌕</span><input type="search" {...props} /></label>;
}
