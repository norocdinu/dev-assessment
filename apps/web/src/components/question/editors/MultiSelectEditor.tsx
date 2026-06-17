'use client';
import type { EditorProps } from './types';
import type { MultiSelectContent, MultiSelectKey } from '@dev-assessment/shared';

export function MultiSelectEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as MultiSelectContent;
  const k = answerKey as MultiSelectKey;
  const toggle = (i: number) => {
    const has = k.correctIndices.includes(i);
    onChange(c, { correctIndices: has ? k.correctIndices.filter((x) => x !== i) : [...k.correctIndices, i] });
  };
  const setOpt = (i: number, v: string) => onChange({ ...c, options: c.options.map((o, j) => (j === i ? v : o)) }, k);
  const add = () => onChange({ ...c, options: [...c.options, ''] }, k);
  const remove = (i: number) => onChange(
    { ...c, options: c.options.filter((_, j) => j !== i) },
    { correctIndices: k.correctIndices.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) },
  );
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="checkbox" checked={k.correctIndices.includes(i)} onChange={() => toggle(i)} />
          <input value={o} onChange={(e) => setOpt(i, e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" placeholder={`Option ${i + 1}`} />
          {c.options.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Option</button>
    </div>
  );
}
