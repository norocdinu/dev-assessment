'use client';

interface TimerProps {
  remainingMs: number;
}

function formatTime(ms: number): { minutes: number; seconds: number; display: string } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { minutes, seconds, display };
}

export function Timer({ remainingMs }: TimerProps) {
  const { minutes, seconds, display } = formatTime(remainingMs);

  const isUrgent = remainingMs <= 300000; // under 5 minutes
  const isCritical = remainingMs <= 60000; // under 1 minute

  // Calm colour escalation: brand → amber → danger. No flashing except the
  // single status dot in the final minute, which earns the attention.
  const tone = isCritical
    ? 'border-danger/40 bg-danger/5 text-danger'
    : isUrgent
    ? 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400'
    : 'border-border bg-card text-foreground';

  const dotTone = isCritical ? 'bg-danger' : isUrgent ? 'bg-amber-500' : 'bg-[var(--brand)]';

  return (
    <div
      className={`flex items-center gap-2.5 rounded-full border px-3 py-1.5 transition-colors ${tone}`}
      aria-live="polite"
      aria-label={`Time remaining: ${minutes} minutes ${seconds} seconds`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotTone}`}
        style={isCritical ? { animation: 'candidate-tick 1s steps(1) infinite' } : undefined}
      />
      <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted sm:inline">
        Time
      </span>
      <span className="font-mono text-[17px] font-medium leading-none tabular-nums">{display}</span>
    </div>
  );
}
