import type { QuestionContent, AnswerKey } from '@dev-assessment/shared';

export interface EditorProps {
  content: QuestionContent;
  answerKey: AnswerKey;
  onChange: (content: QuestionContent, answerKey: AnswerKey) => void;
}
