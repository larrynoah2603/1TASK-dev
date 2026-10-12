import type { ReactNode } from "react";
import { ActivityIcon, type ActivityType } from "@/components/activity-icon";

type TimelineItem = { title: string; description?: string; meta?: string; actor?: string; type?: ActivityType | string; icon?: ReactNode; tone?: "info" | "success" | "warning" | "danger" | "neutral"; content?: ReactNode };

export function Timeline({ items, className = "" }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={`kit-timeline ${className}`.trim()}>
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className={`kit-timeline-item kit-timeline-${item.tone ?? "info"}`}>
          <span className="kit-timeline-marker">{item.icon ?? <ActivityIcon type={item.type} />}</span>
          <div className="kit-timeline-content">
            {item.content ?? (
              <>
                <p className="kit-timeline-title">{item.title}</p>
                {item.description ? <p className="kit-timeline-note">{item.description}</p> : null}
                {item.meta ? <p className="kit-timeline-meta">{item.actor ? `${item.actor} • ` : ""}<time>{item.meta}</time></p> : null}
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
export type { TimelineItem };
export default Timeline;
