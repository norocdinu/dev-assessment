'use client';
import type { CandidateInputProps } from './types';
import type { FillBlankResp, Block } from '@dev-assessment/shared';

export function FillBlankInput({ content, value, onChange }: CandidateInputProps) {
  const prompt = (content as { prompt: Block[] }).prompt;
  const values = (value as FillBlankResp | undefined)?.values ?? [];
  // flatten text blocks, splitting on ___, to render inline inputs in order
  let blankIdx = -1;
  const setVal = (i: number, v: string) => {
    const next = [...values];
    while (next.length <= i) next.push('');
    next[i] = v; onChange({ values: next });
  };
  return (
    <div className="text-sm leading-8">
      {prompt.filter((b) => b.type === 'text').map((b, bi) => {
        const parts = (b as { text: string }).text.split('___');
        return (
          <span key={bi}>
            {parts.map((p, pi) => (
              <span key={pi}>
                {p}
                {pi < parts.length - 1 && (() => { blankIdx++; const i = blankIdx; return (
                  <input value={values[i] ?? ''} onChange={(e) => setVal(i, e.target.value)}
                    className="inline-block mx-1 px-2 py-0.5 border-b-2 border-border focus:border-[var(--brand)] outline-none text-sm" />
                ); })()}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}
