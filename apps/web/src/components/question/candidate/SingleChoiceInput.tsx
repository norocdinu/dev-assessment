'use client';
import type { CandidateInputProps } from './types';
import type { SingleChoiceResp } from '@dev-assessment/shared';
export function SingleChoiceInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { options: string[] };
  const v = value as SingleChoiceResp | undefined;
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <label key={i} className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-3 py-2">
          <input type="radio" name="ans" checked={v?.index === i} onChange={() => onChange({ index: i })} />{o}
        </label>
      ))}
    </div>
  );
}
