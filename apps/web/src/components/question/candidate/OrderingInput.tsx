'use client';
import { useState, useEffect } from 'react';
import type { CandidateInputProps } from './types';
import type { OrderingResp, ShuffledItem } from '@dev-assessment/shared';
export function OrderingInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { items: ShuffledItem[] };
  // local arrangement of ShuffledItem; initialise from the shuffled display order
  const [arr, setArr] = useState<ShuffledItem[]>(c.items);
  useEffect(() => {
    const order = (value as OrderingResp | undefined)?.order;
    if (order) setArr(order.map((idx) => c.items.find((it) => it.idx === idx)!).filter(Boolean));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (next: ShuffledItem[]) => { setArr(next); onChange({ order: next.map((it) => it.idx) }); };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= arr.length) return;
    const next = [...arr]; [next[i], next[j]] = [next[j], next[i]]; commit(next);
  };
  return (
    <div className="space-y-2">
      {arr.map((it, i) => (
        <div key={it.idx} className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
          <span className="text-xs text-muted w-5">{i + 1}.</span>
          <span className="flex-1 text-sm">{it.text}</span>
          <button type="button" onClick={() => move(i, -1)} className="text-xs px-1">▲</button>
          <button type="button" onClick={() => move(i, 1)} className="text-xs px-1">▼</button>
        </div>
      ))}
    </div>
  );
}
