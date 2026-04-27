'use client';

import { useEffect, useRef } from 'react';

interface SubmitModalProps {
  unansweredCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SubmitModal({ unansweredCount, onConfirm, onCancel }: SubmitModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-heading"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 id="submit-modal-heading" className="text-base font-semibold text-gray-900 mb-2">
          Submit with unanswered questions?
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          You have {unansweredCount} unanswered{' '}
          {unansweredCount === 1 ? 'question' : 'questions'}. Your score will only count answered
          questions.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Keep going
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Submit anyway
          </button>
        </div>
      </div>
    </div>
  );
}
