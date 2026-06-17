'use client';
import type { EditorProps } from './types';
import type { SingleChoiceContent, SingleChoiceKey } from '@dev-assessment/shared';

export function SingleChoiceEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as SingleChoiceContent;
  const k = answerKey as SingleChoiceKey;
  const setOpt = (i: number, v: string) =>
    onChange({ ...c, options: c.options.map((o, j) => (j === i ? v : o)) }, k);
  const add = () => onChange({ ...c, options: [...c.options, ''] }, k);
  const remove = (i: number) =>
    onChange({ ...c, options: c.options.filter((_, j) => j !== i) },
             { correctIndex: k.correctIndex > i ? k.correctIndex - 1 : k.correctIndex });
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" name="sc-correct" checked={k.correctIndex === i}
            onChange={() => onChange(c, { correctIndex: i })} />
          <input value={o} onChange={(e) => setOpt(i, e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" placeholder={`Option ${i + 1}`} />
          {c.options.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Option</button>
    </div>
  );
}
