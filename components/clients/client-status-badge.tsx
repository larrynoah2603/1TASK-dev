import { CheckCircle2, PauseCircle } from "lucide-react";

export function ClientStatusBadge({ isActive }: { isActive: boolean }) {
  const Icon = isActive ? CheckCircle2 : PauseCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {isActive ? "Actif" : "Inactif"}
    </span>
  );
}
