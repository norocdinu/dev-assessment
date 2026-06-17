'use client';
import type { EditorProps } from './types';
import type { MatchingContent } from '@dev-assessment/shared';

export function MatchingEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as MatchingContent;
  const sync = (left: string[], right: string[]) => {
    const map: Record<string, number> = {};
    left.forEach((_, i) => { map[String(i)] = i; });
    onChange({ ...c, left, right }, { map });
  };
  const setLeft = (i: number, v: string) => sync(c.left.map((x, j) => (j === i ? v : x)), c.right);
  const setRight = (i: number, v: string) => sync(c.left, c.right.map((x, j) => (j === i ? v : x)));
  const add = () => sync([...c.left, ''], [...c.right, '']);
  const remove = (i: number) => sync(c.left.filter((_, j) => j !== i), c.right.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Each row is a correct pair; the right column is shuffled for candidates.</p>
      {c.left.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={l} onChange={(e) => setLeft(i, e.target.value)} placeholder={`Left ${i + 1}`}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          <span className="text-muted">↔</span>
          <input value={c.right[i] ?? ''} onChange={(e) => setRight(i, e.target.value)} placeholder={`Right ${i + 1}`}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          {c.left.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Pair</button>
    </div>
  );
}
