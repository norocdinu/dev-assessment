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
  return `${m}:${String(s).padStart(2, '0')}`;
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
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-heading"
    >
      <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border">
        <h2
          id="submit-modal-heading"
          className="text-xl font-bold text-foreground mb-1"
        >
          Ready to submit?
        </h2>
        <p className="text-sm text-muted mb-5">
          Double-check before sending your answers.
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between bg-background rounded-lg px-4 py-3">
            <span className="text-sm text-muted">Answered</span>
            <span className="text-sm font-semibold text-foreground">
              {answeredCount} / {totalCount}
            </span>
          </div>
          <div className="flex items-center justify-between bg-background rounded-lg px-4 py-3">
            <span className="text-sm text-muted">Time remaining</span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                remainingMs <= 300000 ? 'text-amber-500' : 'text-foreground'
              }`}
            >
              {formatTime(remainingMs)}
            </span>
          </div>
          {unansweredCount > 0 && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              <span className="text-amber-500 text-sm mt-0.5">⚠</span>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {unansweredCount} {unansweredCount === 1 ? 'question is' : 'questions are'} unanswered — {unansweredCount === 1 ? 'it' : 'they'} will score 0.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-medium text-foreground bg-background border border-border rounded-xl hover:bg-border/50 transition-colors"
          >
            Keep reviewing
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-[var(--brand)] rounded-xl hover:opacity-90 transition-opacity"
          >
            Submit test
          </button>
        </div>
      </div>
    </div>
  );
}
