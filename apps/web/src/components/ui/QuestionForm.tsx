'use client';

import { useState } from 'react';
import type { Technology, QuestionType, QuestionContent, AnswerKey, Block } from '@dev-assessment/shared';
import { StimulusBuilder } from '@/components/question/StimulusBuilder';
import { SingleChoiceEditor } from '@/components/question/editors/SingleChoiceEditor';
import { MultiSelectEditor } from '@/components/question/editors/MultiSelectEditor';
import { TrueFalseEditor } from '@/components/question/editors/TrueFalseEditor';
import { MatchingEditor } from '@/components/question/editors/MatchingEditor';
import { OrderingEditor } from '@/components/question/editors/OrderingEditor';
import { FillBlankEditor } from '@/components/question/editors/FillBlankEditor';

export interface QuestionFormValues {
  technology_id: string;
  difficulty: string;
  skill_area: string;
  type: QuestionType;
  content: QuestionContent;
  answer_key: AnswerKey;
  explanation: string;
}

interface Props {
  initialValues?: Partial<QuestionFormValues>;
  onSubmit: (data: QuestionFormValues) => void;
  isLoading: boolean;
  technologies: Technology[];
  currentVersion?: number;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single choice', multi_select: 'Multiple select', true_false: 'True / False',
  matching: 'Matching', ordering: 'Ordering', fill_blank: 'Fill in the blank',
};

function emptyFor(type: QuestionType): { content: QuestionContent; answer_key: AnswerKey } {
  const prompt: Block[] = [{ type: 'text', text: '' }];
  switch (type) {
    case 'single_choice': return { content: { prompt, options: ['', ''] }, answer_key: { correctIndex: 0 } };
    case 'multi_select':  return { content: { prompt, options: ['', ''] }, answer_key: { correctIndices: [] } };
    case 'true_false':    return { content: { prompt }, answer_key: { correct: true } };
    case 'matching':      return { content: { prompt, left: ['', ''], right: ['', ''] }, answer_key: { map: { '0': 0, '1': 1 } } };
    case 'ordering':      return { content: { prompt, items: ['', ''] }, answer_key: { order: [0, 1] } };
    case 'fill_blank':    return { content: { prompt }, answer_key: { blanks: [] } };
  }
}

const EDITORS = {
  single_choice: SingleChoiceEditor, multi_select: MultiSelectEditor, true_false: TrueFalseEditor,
  matching: MatchingEditor, ordering: OrderingEditor, fill_blank: FillBlankEditor,
} as const;

export function QuestionForm({ initialValues, onSubmit, isLoading, technologies, currentVersion }: Props) {
  const initialType = (initialValues?.type ?? 'single_choice') as QuestionType;
  const seed = initialValues?.content && initialValues?.answer_key
    ? { content: initialValues.content, answer_key: initialValues.answer_key }
    : emptyFor(initialType);

  const [values, setValues] = useState<QuestionFormValues>({
    technology_id: initialValues?.technology_id ?? '',
    difficulty: initialValues?.difficulty ?? 'mid',
    skill_area: initialValues?.skill_area ?? '',
    type: initialType,
    content: seed.content,
    answer_key: seed.answer_key,
    explanation: initialValues?.explanation ?? '',
  });
  const [error, setError] = useState('');

  const Editor = EDITORS[values.type];

  function changeType(type: QuestionType) {
    const fresh = emptyFor(type);
    // preserve the prompt the author already wrote
    setValues((v) => ({ ...v, type, content: { ...fresh.content, prompt: v.content.prompt }, answer_key: fresh.answer_key }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.technology_id || !values.skill_area) { setError('Technology and skill area are required'); return; }
    if (!values.content.prompt.some((b) => b.type !== 'text' || b.text.trim())) { setError('Add some question stimulus'); return; }
    setError('');
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {currentVersion && (
        <p className="text-sm text-[var(--brand)] bg-[rgb(var(--brand-rgb))]/10 px-3 py-2 rounded">
          Editing v{currentVersion} — saving will create v{currentVersion + 1}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Technology</label>
          <select value={values.technology_id} onChange={(e) => setValues((v) => ({ ...v, technology_id: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md text-sm">
            <option value="">Select...</option>
            {technologies.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Difficulty</label>
          <select value={values.difficulty} onChange={(e) => setValues((v) => ({ ...v, difficulty: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md text-sm">
            <option value="junior">Junior</option><option value="mid">Mid</option><option value="senior">Senior</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Skill Area</label>
          <input value={values.skill_area} onChange={(e) => setValues((v) => ({ ...v, skill_area: e.target.value }))}
            placeholder="e.g. DAX" className="w-full px-3 py-2 border border-border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Type</label>
          <select value={values.type} onChange={(e) => changeType(e.target.value as QuestionType)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm">
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>

      <StimulusBuilder value={values.content.prompt} onChange={(prompt) => setValues((v) => ({ ...v, content: { ...v.content, prompt } }))} />

      <div className="border border-border rounded-md p-3">
        <div className="text-sm font-medium text-foreground/80 mb-2">Answer — {TYPE_LABELS[values.type]}</div>
        <Editor content={values.content} answerKey={values.answer_key}
          onChange={(content, answer_key) => setValues((v) => ({ ...v, content, answer_key }))} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">Explanation (optional)</label>
        <textarea rows={2} value={values.explanation} onChange={(e) => setValues((v) => ({ ...v, explanation: e.target.value }))}
          className="w-full px-3 py-2 border border-border rounded-md text-sm" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={isLoading}
        className="px-6 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50">
        {isLoading ? 'Saving…' : 'Save Question'}
      </button>
    </form>
  );
}
