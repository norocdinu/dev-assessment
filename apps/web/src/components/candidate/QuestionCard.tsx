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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500 mb-2">
        Question {questionNumber} of {totalQuestions}
      </p>
      <p className="text-base text-gray-900 mb-6 leading-relaxed">{question.text}</p>
      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const isSelected = selectedAnswer === opt;
          const optionText = question[`option_${opt}` as keyof CandidateQuestion] as string;
          return (
            <label
              key={opt}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
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
              <span className="text-xs font-semibold text-gray-500 w-5 shrink-0 mt-0.5">
                {OPTION_LABELS[opt]}
              </span>
              <span className="text-sm text-gray-700">{optionText}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
