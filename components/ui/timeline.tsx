import type { ReactNode } from "react";

type TimelineItem = { title: string; description?: string; meta?: string; icon?: ReactNode; tone?: "info" | "success" | "warning" | "danger" | "neutral" };

export function Timeline({ items, className = "" }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={`kit-timeline ${className}`.trim()}>
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className={`kit-timeline-item kit-timeline-${item.tone ?? "info"}`}>
          <span className="kit-timeline-marker" aria-hidden="true">{item.icon ?? <span className="kit-badge-dot" />}</span>
          <div className="kit-timeline-content">
            <p className="kit-timeline-title">{item.title}</p>
            {item.meta ? <p className="kit-timeline-meta"><time>{item.meta}</time></p> : null}
            {item.description ? <p className="kit-timeline-note">{item.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
export type { TimelineItem };
export default Timeline;
