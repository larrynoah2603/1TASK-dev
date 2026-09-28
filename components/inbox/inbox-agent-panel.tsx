import type { ReactNode } from "react";
import { Activity } from "lucide-react";

export function InboxAgentPanel({ children }: { children: ReactNode }) {
  return <aside className="space-y-4"><div className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[.12em] text-slate-500"><Activity className="size-4 text-teal-700" /> Pilotage agent</div>{children}</aside>;
}
