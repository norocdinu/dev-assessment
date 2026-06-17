'use client';
import type { CandidateInputProps } from './types';
import type { MultiSelectResp } from '@dev-assessment/shared';
export function MultiSelectInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { options: string[] };
  const v = (value as MultiSelectResp | undefined)?.indices ?? [];
  const toggle = (i: number) => onChange({ indices: v.includes(i) ? v.filter((x) => x !== i) : [...v, i] });
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <label key={i} className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-3 py-2">
          <input type="checkbox" checked={v.includes(i)} onChange={() => toggle(i)} />{o}
        </label>
      ))}
    </div>
  );
}
