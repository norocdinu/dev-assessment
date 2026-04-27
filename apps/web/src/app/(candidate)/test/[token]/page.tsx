'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Timer } from '@/components/candidate/Timer';
import { QuestionCard } from '@/components/candidate/QuestionCard';
import { QuestionNav } from '@/components/candidate/QuestionNav';
import { SubmitModal } from '@/components/candidate/SubmitModal';
import type { CandidateQuestion, LocalSession } from '@dev-assessment/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
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
        router.push(`/test/${token}/expired?state=submitted`);
        return;
      }

      if (res.status === 409) {
        // D-09: already submitted — treat as success
        router.push(`/test/${token}/expired?state=submitted`);
        return;
      }

      if (res.status === 410) {
        // D-08: deadline exceeded
        router.push(`/test/${token}/expired?state=timelimit`);
        return;
      }

      // D-07: other error — show inline with retry
      setSubmitError('Submission failed. Check your connection and try again.');
      submittingRef.current = false;
      setSubmitting(false);
    } catch {
      // D-07: network error
      setSubmitError('Submission failed. Check your connection and try again.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [token, answers, router]);

  // Auto-submit timer interval
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

  // Session load on mount
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
          router.push(`/test/${token}/expired?state=submitted`);
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
    const unanswered = questions.filter((q) => !answers[q.id]).length;
    if (unanswered > 0) {
      setShowModal(true);
    } else {
      doSubmit();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading your test…</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const unansweredCount = questions.filter((q) => !answers[q.id]).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Timer remainingMs={Math.max(0, remainingMs)} />
        <span
          className="text-sm font-medium text-gray-500"
          aria-label={`Question ${currentIndex + 1} of ${questions.length}`}
        >
          Question {currentIndex + 1} of {questions.length}
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mt-4">
          <QuestionNav
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            answers={answers}
            questionIds={questions.map((q) => q.id)}
            onNavigate={handleNavigate}
          />
        </div>

        <div className="mt-6">
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            selectedAnswer={answers[currentQuestion.id]}
            onAnswer={(ans) => handleAnswer(currentQuestion.id, ans)}
          />
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => handleNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={() => handleNavigate(currentIndex + 1)}
            disabled={currentIndex === questions.length - 1}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>

        <div className="mt-8 flex flex-col items-end">
          {submitError && (
            <div className="mb-3 flex items-center gap-3">
              <p className="text-sm text-red-600">{submitError}</p>
              <button
                onClick={() => {
                  submittingRef.current = false;
                  setSubmitting(false);
                  doSubmit();
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}
          <button
            onClick={handleSubmitClick}
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Test'}
          </button>
          {unansweredCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {unansweredCount} {unansweredCount === 1 ? 'question' : 'questions'} not yet answered
            </p>
          )}
        </div>
      </div>

      {showModal && (
        <SubmitModal
          unansweredCount={unansweredCount}
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
