'use client';
import type { CandidateInputProps } from './types';
import type { TrueFalseResp } from '@dev-assessment/shared';
export function TrueFalseInput({ value, onChange }: CandidateInputProps) {
  const v = value as TrueFalseResp | undefined;
  return (
    <div className="flex gap-3">
      {[true, false].map((b) => (
        <label key={String(b)} className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-4 py-2">
          <input type="radio" name="tf" checked={v?.value === b} onChange={() => onChange({ value: b })} />{b ? 'True' : 'False'}
        </label>
      ))}
    </div>
  );
}
