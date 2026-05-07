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
    <div className="flex flex-wrap gap-2" role="navigation" aria-label="Question navigation">
      {Array.from({ length: totalQuestions }, (_, i) => {
        const isAnswered = Boolean(answers[questionIds[i]]);
        const isCurrent = i === currentIndex;

        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            aria-label={`Go to question ${i + 1}${isAnswered ? ' (answered)' : ''}`}
            aria-current={isCurrent ? 'true' : undefined}
            className={`w-9 h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
              isCurrent
                ? 'ring-2 ring-[var(--brand)] ring-offset-1 ring-offset-background bg-[var(--brand)]/10 text-[var(--brand)]'
                : isAnswered
                ? 'bg-[var(--brand)] text-white shadow-sm'
                : 'bg-border text-muted hover:bg-[var(--brand)]/20 hover:text-[var(--brand)]'
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
