"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="ui-empty-state" role="status">{icon ?? <Inbox aria-hidden="true" />}<h2>{title}</h2>{description ? <p>{description}</p> : null}{action ? <div className="ui-empty-state-action">{action}</div> : null}</div>;
}
