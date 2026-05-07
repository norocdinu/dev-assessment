'use client';

import { useState } from 'react';
import type { Question, Technology } from '@dev-assessment/shared';

interface QuestionFormValues {
  technology_id: string;
  difficulty: string;
  skill_area: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
}

interface QuestionFormProps {
  initialValues?: Partial<QuestionFormValues>;
  onSubmit: (data: QuestionFormValues) => void;
  isLoading: boolean;
  technologies: Technology[];
  currentVersion?: number;
}

const EMPTY: QuestionFormValues = {
  technology_id: '',
  difficulty: 'mid',
  skill_area: '',
  text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'a',
  explanation: '',
};

export function QuestionForm({
  initialValues,
  onSubmit,
  isLoading,
  technologies,
  currentVersion,
}: QuestionFormProps) {
  const [values, setValues] = useState<QuestionFormValues>({ ...EMPTY, ...initialValues });
  const [errors, setErrors] = useState<Partial<Record<keyof QuestionFormValues, string>>>({});

  function set(field: keyof QuestionFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      setErrors((er) => ({ ...er, [field]: '' }));
    };
  }

  function validate(): boolean {
    const required: Array<keyof QuestionFormValues> = [
      'technology_id', 'difficulty', 'skill_area', 'text',
      'option_a', 'option_b', 'option_c', 'option_d', 'correct_option',
    ];
    const errs: typeof errors = {};
    for (const f of required) {
      if (!values[f]) errs[f] = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
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
          <select value={values.technology_id} onChange={set('technology_id')} className="w-full px-3 py-2 border border-border rounded-md text-sm">
            <option value="">Select...</option>
            {technologies.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errors.technology_id && <p className="text-xs text-red-600 mt-1">{errors.technology_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Difficulty</label>
          <select value={values.difficulty} onChange={set('difficulty')} className="w-full px-3 py-2 border border-border rounded-md text-sm">
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">Skill Area</label>
        <input type="text" value={values.skill_area} onChange={set('skill_area')} placeholder="e.g. DAX, Data Modelling" className="w-full px-3 py-2 border border-border rounded-md text-sm" />
        {errors.skill_area && <p className="text-xs text-red-600 mt-1">{errors.skill_area}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">Question Text</label>
        <textarea rows={3} value={values.text} onChange={set('text')} className="w-full px-3 py-2 border border-border rounded-md text-sm" />
        {errors.text && <p className="text-xs text-red-600 mt-1">{errors.text}</p>}
      </div>

      {(['a', 'b', 'c', 'd'] as const).map((opt) => (
        <div key={opt}>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Option {opt.toUpperCase()}</label>
          <input
            type="text"
            value={values[`option_${opt}` as keyof QuestionFormValues]}
            onChange={set(`option_${opt}` as keyof QuestionFormValues)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm"
          />
          {errors[`option_${opt}` as keyof QuestionFormValues] && (
            <p className="text-xs text-red-600 mt-1">{errors[`option_${opt}` as keyof QuestionFormValues]}</p>
          )}
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">Correct Answer</label>
        <div className="flex gap-4">
          {(['a', 'b', 'c', 'd'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="correct_option"
                value={opt}
                checked={values.correct_option === opt}
                onChange={set('correct_option')}
              />
              {opt.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">Explanation (optional)</label>
        <textarea rows={2} value={values.explanation} onChange={set('explanation')} className="w-full px-3 py-2 border border-border rounded-md text-sm" />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50"
      >
        {isLoading ? 'Saving…' : 'Save Question'}
      </button>
    </form>
  );
}
