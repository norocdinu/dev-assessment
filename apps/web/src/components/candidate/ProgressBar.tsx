interface ProgressBarProps {
  answered: number;
  total: number;
}

export function ProgressBar({ answered, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <div
      className="h-1 w-full bg-border"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${answered} of ${total} questions answered`}
    >
      <div
        className="h-full bg-[var(--brand)] transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
