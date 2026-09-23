import type { ReactNode } from "react";

type TimelineItem = { title: string; description?: string; meta?: string; icon?: ReactNode; tone?: "info" | "success" | "warning" | "danger" | "neutral" };

export function Timeline({ items, className = "" }: { items: TimelineItem[]; className?: string }) {
  return <ol className={`ui-enterprise-timeline ${className}`}>{items.map((item, index) => <li key={`${item.title}-${index}`} className={`ui-enterprise-timeline-item ui-enterprise-timeline-${item.tone ?? "info"}`}><span className="ui-enterprise-timeline-marker" aria-hidden="true">{item.icon ?? ""}</span><div className="ui-enterprise-timeline-content"><div className="ui-enterprise-timeline-heading"><strong>{item.title}</strong>{item.meta ? <time>{item.meta}</time> : null}</div>{item.description ? <p>{item.description}</p> : null}</div></li>)}</ol>;
}
export type { TimelineItem };
export default Timeline;
