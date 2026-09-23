import type { ComponentType, ReactNode } from "react";

type StatTone = "neutral" | "info" | "success" | "warning" | "danger";

type StatCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  iconComponent?: ComponentType<{ "aria-hidden"?: boolean }>;
  evolution?: string;
  trend?: "positive" | "negative" | "neutral";
  tone?: StatTone;
  description?: string;
  href?: string;
  className?: string;
};

export function StatCard({ title, value, icon, iconComponent: Icon, evolution, trend = "neutral", tone = "info", description, href, className = "" }: StatCardProps) {
  const iconNode = Icon ? <Icon aria-hidden /> : icon ? <span className="ui-stat-card-icon" aria-hidden="true">{icon}</span> : null;
  const content = (
    <>
      <div className="ui-stat-card-header"><span>{title}</span>{iconNode}</div>
      <strong className="ui-stat-card-value">{value}</strong>
      <div className="ui-stat-card-footer">
        {evolution ? <span className={`ui-stat-card-evolution ui-stat-card-evolution-${trend}`}>{evolution}</span> : null}
        {description ? <span>{description}</span> : null}
      </div>
    </>
  );
  return href ? <a href={href} className={`ui-stat-card ui-stat-card-${tone} ui-stat-card-link ${className}`}>{content}</a> : <article className={`ui-stat-card ui-stat-card-${tone} ${className}`}>{content}</article>;
}

export type { StatCardProps, StatTone };
export default StatCard;
