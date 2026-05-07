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
  selectedAnswer,
  onAnswer,
}: QuestionCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <p className="text-lg text-foreground leading-relaxed mb-6">{question.text}</p>
      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const isSelected = selectedAnswer === opt;
          const optionText = question[`option_${opt}` as keyof CandidateQuestion] as string;
          return (
            <label
              key={opt}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm'
                  : 'border-border bg-card hover:border-[var(--brand)]/50 hover:bg-[var(--brand)]/5'
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
                className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-border text-muted'
                }`}
              >
                {OPTION_LABELS[opt]}
              </span>
              <span className="text-sm text-foreground leading-relaxed">{optionText}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
