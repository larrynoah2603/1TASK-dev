import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export function Button({ className = "", variant = "primary", size = "md", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return <button className={`kit-btn kit-btn-${variant}${size === "sm" ? " kit-btn-sm" : ""} ${className}`.trim()} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`kit-card ${className}`.trim()} {...props} />;
}

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`kit-badge kit-badge-${tone} ${className}`.trim()}>{children}</span>;
}

export function Progress({ value, tone = "brand", label }: { value: number; tone?: "brand" | "success" | "warning" | "danger"; label?: string }) {
  const bounded = Math.min(100, Math.max(0, value));
  return <div className="kit-progress" role="progressbar" aria-valuenow={bounded} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span className={`kit-progress-fill${tone === "brand" ? "" : ` kit-progress-${tone}`}`} style={{ width: `${bounded}%` }} /></div>;
}

export const ProgressBar = Progress;
export const SLAProgress = Progress;

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <Badge tone={tone}><span className="kit-badge-dot" aria-hidden="true" />{children}</Badge>;
}

export function Timeline({ items }: { items: Array<{ title: string; description?: string; meta?: string }> }) {
  return (
    <ol className="kit-timeline">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="kit-timeline-item">
          <span className="kit-timeline-marker" aria-hidden="true"><span className="kit-badge-dot" /></span>
          <div className="kit-timeline-content">
            <p className="kit-timeline-title">{item.title}</p>
            {item.meta ? <p className="kit-timeline-meta">{item.meta}</p> : null}
            {item.description ? <p className="kit-timeline-note">{item.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Table({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return <div className={`kit-table-wrap ${className}`.trim()}><table className="kit-table" aria-label={label}>{children}</table></div>;
}

export function Modal({ title, children, footer, onClose }: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  return (
    <div className="kit-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="kit-modal" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">
        <header className="kit-modal-head">
          <h2 id="ui-modal-title">{title}</h2>
          <button type="button" className="kit-icon-btn" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div className="kit-modal-body">{children}</div>
        {footer ? <footer className="kit-modal-foot">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function ErrorState({ title = "Une erreur est survenue", description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div className="kit-state" role="alert"><div className="kit-state-icon kit-state-icon-danger" aria-hidden="true">!</div><h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="kit-state"><div className="kit-state-icon" aria-hidden="true">+</div><h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</div>;
}

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`kit-skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function SearchInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`kit-search-form ${className}`.trim()}><span aria-hidden="true">⌕</span><input type="search" {...props} /></label>;
}
