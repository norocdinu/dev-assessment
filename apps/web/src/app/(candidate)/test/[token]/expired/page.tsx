'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { Brandmark } from '@/components/candidate/Brandmark';

type StateKey = 'expired' | 'submitted' | 'notfound' | 'timelimit';

const ClockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
);

const CrossIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </svg>
);

const STATE_CONTENT: Record<StateKey, { icon: ReactNode; heading: string; body: string; tone: 'neutral' | 'positive' }> = {
  expired: {
    icon: ClockIcon,
    heading: 'This link has expired',
    body: 'Please contact your interviewer to request a new assessment link.',
    tone: 'neutral',
  },
  submitted: {
    icon: CheckIcon,
    heading: 'Already submitted',
    body: 'Your answers have been recorded. There is nothing more to do here.',
    tone: 'positive',
  },
  notfound: {
    icon: CrossIcon,
    heading: 'Link not found',
    body: 'This link is invalid or has already been used.',
    tone: 'neutral',
  },
  timelimit: {
    icon: ClockIcon,
    heading: "Time's up",
    body: 'Your test time has ended and your answers have been submitted automatically.',
    tone: 'positive',
  },
};

function ExpiredContent() {
  const searchParams = useSearchParams();
  const state = (searchParams.get('state') ?? 'notfound') as StateKey;
  const content = STATE_CONTENT[state] ?? STATE_CONTENT.notfound;

  return (
    <div className="candidate-shell flex flex-col">
      <header className="border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Brandmark />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="anim-rise w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_44px_-24px_rgb(0_0_0/0.18)]">
          <div
            className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
              content.tone === 'positive'
                ? 'bg-success/10 text-success'
                : 'bg-surface text-muted'
            }`}
          >
            {content.icon}
          </div>
          <h1 className="mt-5 font-serif text-2xl font-medium tracking-[-0.01em] text-foreground">
            {content.heading}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{content.body}</p>
        </div>
      </div>
    </div>
  );
}

export default function ExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="candidate-shell flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-[var(--brand)]" />
        </div>
      }
    >
      <ExpiredContent />
    </Suspense>
  );
}
