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

export function AdminStatCard({ label, value, detail, tone = "primary" }: { label: string; value: number | string; detail: string; tone?: "primary" | "success" | "warning" | "danger" }) {
  const tones = {
    primary: "admin-stat-value-primary",
    success: "admin-stat-value-success",
    warning: "admin-stat-value-warning",
    danger: "admin-stat-value-danger",
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
    <div className="admin-empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
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
