'use client';

import { useEffect, useRef } from 'react';

interface SubmitModalProps {
  unansweredCount: number;
  totalCount: number;
  remainingMs: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SubmitModal({
  unansweredCount,
  totalCount,
  remainingMs,
  onConfirm,
  onCancel,
}: SubmitModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const answeredCount = totalCount - unansweredCount;

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 backdrop-blur-sm sm:items-center"
      style={{ animation: 'candidate-rise 0.2s ease-out' }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-heading"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        style={{ animation: 'candidate-rise 0.3s cubic-bezier(0.22,0.7,0.2,1)' }}
      >
        <div className="px-7 pt-7">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Review
          </p>
          <h2
            id="submit-modal-heading"
            className="mt-2 font-serif text-2xl font-medium tracking-[-0.01em] text-foreground"
          >
            Ready to submit?
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Once submitted, your answers are final and cannot be changed.
          </p>
        </div>

        <div className="space-y-2.5 px-7 py-6">
          <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
            <span className="text-sm text-muted">Answered</span>
            <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
              {answeredCount} / {totalCount}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
            <span className="text-sm text-muted">Time remaining</span>
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                remainingMs <= 300000 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {formatTime(remainingMs)}
            </span>
          </div>
          {unansweredCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {unansweredCount} {unansweredCount === 1 ? 'question is' : 'questions are'} unanswered —{' '}
                {unansweredCount === 1 ? 'it' : 'they'} will score 0.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-border bg-surface/40 px-7 py-5 sm:flex-row">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Keep reviewing
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Submit test
          </button>
        </div>
      </div>
    </div>
  );
}
