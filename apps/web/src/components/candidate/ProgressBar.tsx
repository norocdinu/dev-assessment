interface ProgressBarProps {
  answered: number;
  total: number;
}

export function ProgressBar({ answered, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <div
      className="h-[3px] w-full bg-border/60"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${answered} of ${total} questions answered`}
    >
      <div
        className="h-full rounded-r-full bg-[var(--brand)] transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          boxShadow: pct > 0 ? '0 0 8px rgb(var(--brand-rgb) / 0.5)' : 'none',
        }}
      />
    </div>
  );
}
