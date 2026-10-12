import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

export function InboxFilterBar({ children }: { children: ReactNode }) {
  return <section aria-label="Filtres des tickets" className="rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-3 shadow-sm"><div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-[var(--kit-text-2)]"><SlidersHorizontal className="size-3.5" aria-hidden="true" /> Affiner la file de travail</div>{children}</section>;
}
