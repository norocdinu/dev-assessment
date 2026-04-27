'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const STATE_CONTENT: Record<string, { heading: string; body: string }> = {
  expired: {
    heading: 'This link has expired',
    body: 'Contact your interviewer for a new link.',
  },
  submitted: {
    heading: 'Test submitted',
    body: 'Your answers have been recorded. Results coming soon.',
  },
  notfound: {
    heading: 'Link not found',
    body: 'This link is invalid or has already been used.',
  },
  timelimit: {
    heading: "Time's up",
    body: 'Your test time has ended. Your progress has been submitted.',
  },
};

function ExpiredContent() {
  const searchParams = useSearchParams();
  const state = searchParams.get('state') ?? 'notfound';
  const content = STATE_CONTENT[state] ?? STATE_CONTENT.notfound;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full mx-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">{content.heading}</h1>
        <p className="text-sm text-gray-600">{content.body}</p>
      </div>
    </div>
  );
}

export default function ExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <ExpiredContent />
    </Suspense>
  );
}
