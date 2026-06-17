'use client';
import type { CandidateInputProps } from './types';
import type { MatchingResp, ShuffledItem } from '@dev-assessment/shared';
export function MatchingInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { left: string[]; right: ShuffledItem[] };
  const map = (value as MatchingResp | undefined)?.map ?? {};
  const set = (li: number, ri: number) => onChange({ map: { ...map, [String(li)]: ri } });
  return (
    <div className="space-y-2">
      {c.left.map((l, li) => (
        <div key={li} className="flex items-center gap-2">
          <span className="flex-1 text-sm">{l}</span>
          <select value={map[String(li)] ?? ''} onChange={(e) => set(li, Number(e.target.value))}
            className="px-2 py-1 border border-border rounded text-sm">
            <option value="">Select…</option>
            {c.right.map((r) => <option key={r.idx} value={r.idx}>{r.text}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
