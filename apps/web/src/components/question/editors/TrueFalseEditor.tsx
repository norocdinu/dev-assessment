'use client';
import type { EditorProps } from './types';
import type { TrueFalseKey } from '@dev-assessment/shared';

export function TrueFalseEditor({ content, answerKey, onChange }: EditorProps) {
  const k = answerKey as TrueFalseKey;
  return (
    <div className="flex gap-4">
      {[true, false].map((v) => (
        <label key={String(v)} className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="radio" name="tf" checked={k.correct === v} onChange={() => onChange(content, { correct: v })} />
          {v ? 'True' : 'False'}
        </label>
      ))}
    </div>
  );
}
