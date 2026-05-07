'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Dev Assessment';

const STATE_CONTENT: Record<string, { heading: string; body: string; icon: string }> = {
  expired: {
    icon: '⏱',
    heading: 'This link has expired',
    body: 'Contact your interviewer for a new link.',
  },
  submitted: {
    icon: '✓',
    heading: 'Already submitted',
    body: 'Your answers have been recorded.',
  },
  notfound: {
    icon: '✕',
    heading: 'Link not found',
    body: 'This link is invalid or has already been used.',
  },
  timelimit: {
    icon: '⏱',
    heading: "Time's up",
    body: 'Your test time has ended. Your answers have been submitted.',
  },
};

function ExpiredContent() {
  const searchParams = useSearchParams();
  const state = searchParams.get('state') ?? 'notfound';
  const content = STATE_CONTENT[state] ?? STATE_CONTENT.notfound;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 border-b border-border">
        <span className="text-base font-bold text-foreground">{BRAND_NAME}</span>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center mx-auto mb-4 text-xl">
            {content.icon}
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{content.heading}</h1>
          <p className="text-sm text-muted">{content.body}</p>
        </div>
      </div>
    </div>
  );
}

export default function ExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-border border-t-[var(--brand)] rounded-full animate-spin" />
        </div>
      }
    >
      <ExpiredContent />
    </Suspense>
  );
}
