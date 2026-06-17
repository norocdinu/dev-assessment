import type { CandidateContent, AnswerResponse } from '@dev-assessment/shared';

export interface CandidateInputProps {
  content: CandidateContent;
  value: AnswerResponse | undefined;
  onChange: (r: AnswerResponse) => void;
}
