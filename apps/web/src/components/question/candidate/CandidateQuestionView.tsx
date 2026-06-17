'use client';
import type { CandidateQuestion, AnswerResponse, Block } from '@dev-assessment/shared';
import { PromptRenderer } from '../PromptRenderer';
import { SingleChoiceInput } from './SingleChoiceInput';
import { MultiSelectInput } from './MultiSelectInput';
import { TrueFalseInput } from './TrueFalseInput';
import { MatchingInput } from './MatchingInput';
import { OrderingInput } from './OrderingInput';
import { FillBlankInput } from './FillBlankInput';
import type { CandidateInputProps } from './types';

const INPUTS: Record<CandidateQuestion['type'], (p: CandidateInputProps) => JSX.Element> = {
  single_choice: SingleChoiceInput, multi_select: MultiSelectInput, true_false: TrueFalseInput,
  matching: MatchingInput, ordering: OrderingInput, fill_blank: FillBlankInput,
};

export function CandidateQuestionView({ question, value, onChange }: {
  question: CandidateQuestion; value: AnswerResponse | undefined; onChange: (r: AnswerResponse) => void;
}) {
  const Input = INPUTS[question.type];
  const prompt = (question.content as { prompt: Block[] }).prompt;

  // fill_blank renders its OWN inline inputs over the prompt's text blocks, so we
  // must not render those text blocks again via PromptRenderer (it would duplicate
  // the text). Show only the non-text blocks (code/image) above the input.
  if (question.type === 'fill_blank') {
    const nonText = prompt.filter((b) => b.type !== 'text');
    return (
      <div className="space-y-4">
        {nonText.length > 0 && <PromptRenderer prompt={nonText} />}
        <Input content={question.content} value={value} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PromptRenderer prompt={prompt} />
      <Input content={question.content} value={value} onChange={onChange} />
    </div>
  );
}
