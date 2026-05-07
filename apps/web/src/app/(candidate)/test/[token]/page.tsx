'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Timer } from '@/components/candidate/Timer';
import { QuestionCard } from '@/components/candidate/QuestionCard';
import { QuestionNav } from '@/components/candidate/QuestionNav';
import { SubmitModal } from '@/components/candidate/SubmitModal';
import { ProgressBar } from '@/components/candidate/ProgressBar';
import type { CandidateQuestion, LocalSession } from '@dev-assessment/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Dev Assessment';
const BRAND_LOGO = process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? null;
const DURATION_MS = 30 * 60 * 1000;

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
  const [remainingMs, setRemainingMs] = useState(DURATION_MS);
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
      const remaining = DURATION_MS - (Date.now() + clockOffset - serverStartedAtMs);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        doSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [serverStartedAtMs, clockOffset, questions.length, doSubmit]);

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
        const { started_at, server_now, questions: qs } = data;

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

        const initialRemaining = DURATION_MS - (Date.now() + offset - startedAtMs);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-border border-t-[var(--brand)] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted">Loading your test…</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            {BRAND_LOGO ? (
              <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-7 object-contain" />
            ) : (
              <span className="text-sm font-bold text-foreground">{BRAND_NAME}</span>
            )}
          </div>
          {/* Timer + question counter */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-muted hidden sm:block">
              {currentIndex + 1} / {questions.length}
            </span>
            <Timer remainingMs={Math.max(0, remainingMs)} />
          </div>
        </div>
        {/* Progress bar — full width, flush below header */}
        <ProgressBar answered={answeredCount} total={questions.length} />
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Question navigation */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <p className="text-xs text-muted">
              {answeredCount} answered
            </p>
          </div>
          <QuestionNav
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            answers={answers}
            questionIds={questions.map((q) => q.id)}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Question card */}
        <div className="mt-4">
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            selectedAnswer={answers[currentQuestion.id]}
            onAnswer={(ans) => handleAnswer(currentQuestion.id, ans)}
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => handleNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-5 py-3 text-sm font-medium text-foreground bg-card border border-border rounded-xl hover:bg-border/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => handleNavigate(currentIndex + 1)}
            disabled={currentIndex === questions.length - 1}
            className="px-5 py-3 text-sm font-medium text-white bg-[var(--brand)] rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Next →
          </button>
        </div>

        {/* Submit */}
        <div className="mt-6 flex flex-col items-end">
          {submitError && (
            <div className="mb-3 flex items-center gap-3">
              <p className="text-sm text-red-500">{submitError}</p>
              <button
                onClick={() => {
                  submittingRef.current = false;
                  setSubmitting(false);
                  doSubmit();
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--brand)] rounded-lg hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}
          <button
            onClick={handleSubmitClick}
            disabled={submitting}
            className="px-6 py-3 bg-[var(--brand)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Submitting…' : 'Submit Test'}
          </button>
          {unansweredCount > 0 && (
            <p className="text-xs text-muted mt-1.5">
              {unansweredCount} {unansweredCount === 1 ? 'question' : 'questions'} not yet answered
            </p>
          )}
        </div>
      </div>

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
