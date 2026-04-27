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

  const colorClass =
    remainingMs > 300000
      ? 'text-green-600'
      : remainingMs > 60000
      ? 'text-amber-600'
      : 'text-red-600 animate-pulse';

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xl font-semibold ${colorClass}`}
      aria-live="polite"
      aria-label={`Time remaining: ${minutes} minutes ${seconds} seconds`}
    >
      {display}
    </span>
  );
}
