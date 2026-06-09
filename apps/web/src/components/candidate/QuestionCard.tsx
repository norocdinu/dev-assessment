'use client';

import type { CandidateQuestion } from '@dev-assessment/shared';

interface QuestionCardProps {
  question: CandidateQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: 'a' | 'b' | 'c' | 'd' | undefined;
  onAnswer: (answer: 'a' | 'b' | 'c' | 'd') => void;
}

const OPTIONS = ['a', 'b', 'c', 'd'] as const;
const OPTION_LABELS: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswer,
}: QuestionCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.12)]">
      {/* Eyebrow — orientation + quiet skill-area context */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-6 py-3.5 sm:px-8">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Question <span className="text-foreground/70">{String(questionNumber).padStart(2, '0')}</span>
          <span className="text-muted/60"> / {String(totalQuestions).padStart(2, '0')}</span>
        </span>
        {question.skill_area && (
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            {question.skill_area}
          </span>
        )}
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        {/* Question framing — serif for editorial gravitas + long-read legibility */}
        <h1 className="font-serif text-[1.4rem] font-medium leading-[1.4] tracking-[-0.01em] text-foreground sm:text-[1.6rem]">
          {question.text}
        </h1>

        <fieldset className="mt-7 space-y-2.5">
          <legend className="sr-only">Select one answer</legend>
          {OPTIONS.map((opt, i) => {
            const isSelected = selectedAnswer === opt;
            const optionText = question[`option_${opt}` as keyof CandidateQuestion] as string;
            return (
              <label
                key={opt}
                style={{ ['--d' as string]: `${120 + i * 70}ms` }}
                className={`anim-rise group relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--brand)] focus-within:ring-offset-2 focus-within:ring-offset-card ${
                  isSelected
                    ? 'border-[var(--brand)] bg-[rgb(var(--brand-rgb)/0.07)]'
                    : 'border-border bg-card hover:border-[rgb(var(--brand-rgb)/0.45)] hover:bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={opt}
                  checked={isSelected}
                  onChange={() => onAnswer(opt)}
                  className="sr-only"
                />
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-[var(--brand)] text-white'
                      : 'border border-border bg-surface text-muted group-hover:border-[rgb(var(--brand-rgb)/0.5)] group-hover:text-foreground'
                  }`}
                >
                  {OPTION_LABELS[opt]}
                </span>
                <span className="pt-0.5 text-[15px] leading-relaxed text-foreground">{optionText}</span>

                {/* Selected check — confirms the choice without shouting */}
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className={`ml-auto mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)] transition-all duration-200 ${
                    isSelected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </label>
            );
          })}
        </fieldset>
      </div>
    </article>
  );
}
