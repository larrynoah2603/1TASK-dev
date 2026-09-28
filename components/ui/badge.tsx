import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";
export function Badge({ tone = "neutral", dot = false, className = "", children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) { return <span className={`ds-badge ds-badge-${tone} ${className}`.trim()} {...props}>{dot ? <span className="ds-badge-dot" aria-hidden="true" /> : null}{children}</span>; }
