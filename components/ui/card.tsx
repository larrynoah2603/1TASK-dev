import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`kit-card ds-card ${className}`.trim()} {...props} />; }
export function CardHeader({ title, description, action, className = "" }: { title: string; description?: string; action?: ReactNode; className?: string }) { return <div className={`kit-panel-head ds-card-header ${className}`.trim()}><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action ? <div>{action}</div> : null}</div>; }
export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`kit-panel-body ds-card-content ${className}`.trim()} {...props} />; }
export function CardFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ds-card-footer ${className}`.trim()} {...props} />; }
