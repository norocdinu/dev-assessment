'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Timer } from '@/components/candidate/Timer';
import { QuestionCard } from '@/components/candidate/QuestionCard';
import { QuestionNav } from '@/components/candidate/QuestionNav';
import { SubmitModal } from '@/components/candidate/SubmitModal';
import { ProgressBar } from '@/components/candidate/ProgressBar';
import { Brandmark } from '@/components/candidate/Brandmark';
import type { CandidateQuestion, LocalSession } from '@dev-assessment/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
// Fallback only — the authoritative duration comes from the session payload.
const DEFAULT_DURATION_MS = 30 * 60 * 1000;

function getLocalSession(token: string): LocalSession | null {
  try {
    const raw = localStorage.getItem(`da_session_${token}`);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

function saveLocalSession(session: LocalSession): void {
  try {
    localStorage.setItem(`da_session_${session.token}`, JSON.stringify(session));
  } catch {
    // localStorage unavailable — test continues without persistence
  }
}

export default function TestPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<CandidateQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, 'a' | 'b' | 'c' | 'd'>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(DEFAULT_DURATION_MS);
  const [durationMs, setDurationMs] = useState(DEFAULT_DURATION_MS);
  const [serverStartedAtMs, setServerStartedAtMs] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submittingRef = useRef(false);

  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`${API_URL}/candidate/submit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        router.push(`/test/${token}/results`);
        return;
      }
      if (res.status === 409) {
        router.push(`/test/${token}/results`);
        return;
      }
      if (res.status === 410) {
        router.push(`/test/${token}/expired?state=timelimit`);
        return;
      }

      setSubmitError('Submission failed. Check your connection and try again.');
      submittingRef.current = false;
      setSubmitting(false);
    } catch {
      setSubmitError('Submission failed. Check your connection and try again.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [token, answers, router]);

  useEffect(() => {
    if (questions.length === 0 || serverStartedAtMs === 0) return;

    const interval = setInterval(() => {
      const remaining = durationMs - (Date.now() + clockOffset - serverStartedAtMs);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        doSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [serverStartedAtMs, clockOffset, questions.length, durationMs, doSubmit]);

  useEffect(() => {
    if (!token) return;

    async function loadSession() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/candidate/session/${token}`);

        if (res.status === 410) {
          router.push(`/test/${token}/expired?state=expired`);
          return;
        }
        if (res.status === 409) {
          router.push(`/test/${token}/results`);
          return;
        }
        if (!res.ok) {
          router.push(`/test/${token}/expired?state=notfound`);
          return;
        }

        const data = await res.json();
        const { started_at, server_now, duration_ms, questions: qs } = data;
        const sessionDuration = duration_ms ?? DEFAULT_DURATION_MS;
        setDurationMs(sessionDuration);

        const offset = new Date(server_now).getTime() - Date.now();
        setClockOffset(offset);

        const startedAtMs = new Date(started_at).getTime();
        setServerStartedAtMs(startedAtMs);
        setQuestions(qs);

        const local = getLocalSession(token);
        let restoredAnswers: Record<string, 'a' | 'b' | 'c' | 'd'> = {};
        let restoredIndex = 0;

        if (local && local.startedAt === started_at) {
          restoredAnswers = local.answers;
          restoredIndex = local.currentQuestionIndex;
        }

        setAnswers(restoredAnswers);
        setCurrentIndex(restoredIndex);

        saveLocalSession({
          token,
          startedAt: started_at,
          answers: restoredAnswers,
          currentQuestionIndex: restoredIndex,
        });

        const initialRemaining = sessionDuration - (Date.now() + offset - startedAtMs);
        setRemainingMs(initialRemaining);
      } catch {
        router.push(`/test/${token}/expired?state=notfound`);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [token, router]);

  function handleAnswer(questionId: string, answer: 'a' | 'b' | 'c' | 'd') {
    const updated = { ...answers, [questionId]: answer };
    setAnswers(updated);
    saveLocalSession({
      token,
      startedAt: new Date(serverStartedAtMs).toISOString(),
      answers: updated,
      currentQuestionIndex: currentIndex,
    });
  }

  function handleNavigate(index: number) {
    setCurrentIndex(index);
    saveLocalSession({
      token,
      startedAt: new Date(serverStartedAtMs).toISOString(),
      answers,
      currentQuestionIndex: index,
    });
  }

  function handleSubmitClick() {
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="candidate-shell flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-[var(--brand)]" />
          <p className="mt-5 font-serif text-lg italic text-muted">Preparing your assessment…</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="candidate-shell">
      {/* Sticky header — brand, exam clock, live progress */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Brandmark />
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden font-mono text-xs font-medium tabular-nums text-muted sm:inline">
              {String(currentIndex + 1).padStart(2, '0')}
              <span className="text-muted/50"> / {String(questions.length).padStart(2, '0')}</span>
            </span>
            <Timer remainingMs={Math.max(0, remainingMs)} />
          </div>
        </div>
        <ProgressBar answered={answeredCount} total={questions.length} />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-7 sm:px-6">
        {/* Question card — keyed so it re-animates on navigation */}
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          selectedAnswer={answers[currentQuestion.id]}
          onAnswer={(ans) => handleAnswer(currentQuestion.id, ans)}
        />

        {/* Previous / Next — prominent controls; Next becomes Submit on the last question */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => handleNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-foreground/25 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-card sm:px-6"
          >
            <span aria-hidden className="text-base leading-none">←</span> Previous
          </button>

          {!isLast ? (
            <button
              onClick={() => handleNavigate(currentIndex + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-9"
            >
              Next <span aria-hidden className="text-base leading-none">→</span>
            </button>
          ) : (
            <button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[rgb(var(--brand-rgb)/0.35)] ring-1 ring-[rgb(var(--brand-rgb)/0.4)] transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-9"
            >
              {submitting ? (
                'Submitting…'
              ) : (
                <>
                  Submit test
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>

        {/* Question map */}
        <section className="mt-10 rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Question map
            </h2>
            <span className="font-mono text-[11px] tabular-nums text-muted">
              <span className="text-foreground">{answeredCount}</span> / {questions.length} answered
            </span>
          </div>
          <QuestionNav
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            answers={answers}
            questionIds={questions.map((q) => q.id)}
            onNavigate={handleNavigate}
          />
        </section>

        {/* Submit status + early-submit affordance (the last question's primary
            Submit lives in the nav row above) */}
        <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-border pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {unansweredCount > 0 ? (
              <>
                <span className="font-medium text-foreground">{unansweredCount}</span>{' '}
                {unansweredCount === 1 ? 'question' : 'questions'} still unanswered.
              </>
            ) : (
              <>All questions answered{isLast ? ' — submit when ready.' : '. You can submit any time.'}</>
            )}
          </p>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {submitError && (
              <div className="flex items-center justify-end gap-3">
                <p className="text-sm text-danger">{submitError}</p>
                <button
                  onClick={() => {
                    submittingRef.current = false;
                    setSubmitting(false);
                    doSubmit();
                  }}
                  className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Retry
                </button>
              </div>
            )}
            {!isLast && (
              <button
                onClick={handleSubmitClick}
                disabled={submitting}
                className="rounded-xl border-2 border-[rgb(var(--brand-rgb)/0.4)] bg-card px-6 py-3 text-sm font-semibold text-[var(--brand)] shadow-sm transition-colors hover:bg-[rgb(var(--brand-rgb)/0.06)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {submitting ? 'Submitting…' : 'Submit test'}
              </button>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <SubmitModal
          unansweredCount={unansweredCount}
          totalCount={questions.length}
          remainingMs={Math.max(0, remainingMs)}
          onConfirm={() => {
            setShowModal(false);
            doSubmit();
          }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
