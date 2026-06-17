'use client';
import type { EditorProps } from './types';
import type { OrderingContent } from '@dev-assessment/shared';

export function OrderingEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as OrderingContent;
  const sync = (items: string[]) => onChange({ ...c, items }, { order: items.map((_, i) => i) });
  const setItem = (i: number, v: string) => sync(c.items.map((x, j) => (j === i ? v : x)));
  const add = () => sync([...c.items, '']);
  const remove = (i: number) => sync(c.items.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Enter items in the CORRECT order; candidates see them shuffled.</p>
      {c.items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted w-5">{i + 1}.</span>
          <input value={it} onChange={(e) => setItem(i, e.target.value)} placeholder={`Item ${i + 1}`}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          {c.items.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Item</button>
    </div>
  );
}
