type SlaTone = "normal" | "attention" | "overdue";

type SlaProgressProps = { value: number; label?: string; tone?: SlaTone; showValue?: boolean; className?: string };

export function SlaProgress({ value, label = "SLA", tone, showValue = true, className = "" }: SlaProgressProps) {
  const bounded = Math.max(0, Math.min(100, value));
  const resolvedTone = tone ?? (bounded >= 80 ? "normal" : bounded >= 50 ? "attention" : "overdue");
  return <div className={`ui-sla-progress ui-sla-progress-${resolvedTone} ${className}`}>
    <div className="ui-sla-progress-label"><span>{label}</span>{showValue ? <strong>{bounded}%</strong> : null}</div>
    <div className="ui-sla-progress-track" role="progressbar" aria-label={`${label} ${bounded}%`} aria-valuenow={bounded} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${bounded}%` }} /></div>
  </div>;
}

export type { SlaProgressProps, SlaTone };
export default SlaProgress;
