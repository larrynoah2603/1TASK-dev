export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2">{title}</h1>
        <p className="page-header-description mt-2">{description}</p>
      </div>
      {actions ? <div className="page-header-actions shrink-0">{actions}</div> : null}
    </div>
  );
}

export function AdminStatCard({ label, value, detail, tone = "blue" }: { label: string; value: number | string; detail: string; tone?: "blue" | "emerald" | "amber" | "rose" }) {
  const tones = {
    blue: "text-[#4c4dba]",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  } as const;
  return (
    <div className="admin-stat">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`admin-stat-value mt-2 ${tones[tone]}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-500">—</div>
      <h2 className="mt-4 text-sm font-bold text-slate-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function AdminNotice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  return (
    <div className={tone === "warning" ? "admin-notice admin-notice-warning" : "admin-notice"}>
      {children}
    </div>
  );
}
