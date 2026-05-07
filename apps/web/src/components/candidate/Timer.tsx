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

  const colorClass = isCritical
    ? 'text-red-500 animate-pulse'
    : isUrgent
    ? 'text-amber-500'
    : 'text-[var(--brand)]';

  return (
    <div
      className={`flex items-center gap-2 ${colorClass}`}
      aria-live="polite"
      aria-label={`Time remaining: ${minutes} minutes ${seconds} seconds`}
    >
      <svg
        className="w-4 h-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="text-xl font-bold tabular-nums">{display}</span>
    </div>
  );
}
