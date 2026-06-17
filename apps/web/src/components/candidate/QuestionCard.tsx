'use client';

import type { CandidateQuestion, AnswerResponse } from '@dev-assessment/shared';
import { CandidateQuestionView } from '@/components/question/candidate/CandidateQuestionView';

interface QuestionCardProps {
  question: CandidateQuestion;
  questionNumber: number;
  totalQuestions: number;
  value: AnswerResponse | undefined;
  onChange: (r: AnswerResponse) => void;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  value,
  onChange,
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
        <CandidateQuestionView
          question={question}
          value={value}
          onChange={onChange}
        />
      </div>
    </article>
  );
}
