import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

export function InboxFilterBar({ children }: { children: ReactNode }) {
  return <section aria-label="Filtres des tickets" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-slate-500"><SlidersHorizontal className="size-3.5" /> Affiner la file de travail</div>{children}</section>;
}
