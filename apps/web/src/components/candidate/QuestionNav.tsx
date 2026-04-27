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

        const squareClass = isCurrent
          ? 'ring-2 ring-blue-600 bg-white text-blue-600'
          : isAnswered
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300';

        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            aria-label={`Go to question ${i + 1}`}
            aria-pressed={isCurrent}
            className={`w-8 h-8 rounded text-xs font-medium flex items-center justify-center cursor-pointer ${squareClass}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
