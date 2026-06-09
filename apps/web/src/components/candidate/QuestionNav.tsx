'use client';

interface QuestionNavProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, 'a' | 'b' | 'c' | 'd'>;
  questionIds: string[];
  onNavigate: (index: number) => void;
}

export function QuestionNav({
  totalQuestions,
  currentIndex,
  answers,
  questionIds,
  onNavigate,
}: QuestionNavProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Question navigation">
      {Array.from({ length: totalQuestions }, (_, i) => {
        const isAnswered = Boolean(answers[questionIds[i]]);
        const isCurrent = i === currentIndex;

        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            aria-label={`Go to question ${i + 1}${isAnswered ? ' (answered)' : ''}`}
            aria-current={isCurrent ? 'true' : undefined}
            className={`grid h-8 w-8 place-items-center rounded-lg font-mono text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isCurrent
                ? 'bg-[rgb(var(--brand-rgb)/0.12)] text-[var(--brand)] ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-background'
                : isAnswered
                ? 'bg-[var(--brand)] text-white hover:opacity-90'
                : 'border border-border bg-surface text-muted hover:border-[rgb(var(--brand-rgb)/0.4)] hover:text-foreground'
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
