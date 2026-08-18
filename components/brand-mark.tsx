export function BrandMark({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="brand-mark grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black tracking-[-0.08em] text-white shadow-lg shadow-black/20"
      >
        1T
      </span>
      {!compact ? (
        <span>
          <span className={inverse ? "block text-base font-black tracking-[0.18em] text-white" : "block text-base font-black tracking-[0.18em] text-slate-950"}>
            1TASK
          </span>
          <span className={inverse ? "mt-0.5 block text-[11px] font-medium text-slate-300" : "mt-0.5 block text-[11px] font-medium text-slate-500"}>
            Service desk interne
          </span>
        </span>
      ) : null}
    </div>
  );
}
