'use client';
import { useEffect } from 'react';
import type { EditorProps } from './types';
import type { FillBlankContent, FillBlankKey, Block } from '@dev-assessment/shared';

const countMarkers = (prompt: Block[]) =>
  prompt.reduce((n, b) => n + (b.type === 'text' ? (b.text.match(/___/g)?.length ?? 0) : 0), 0);

export function FillBlankEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as FillBlankContent;
  const k = answerKey as FillBlankKey;
  const markerCount = countMarkers(c.prompt);

  // keep blanks array length in sync with marker count
  useEffect(() => {
    if (k.blanks.length !== markerCount) {
      const blanks = Array.from({ length: markerCount }, (_, i) => k.blanks[i] ?? { accepted: [''] });
      onChange(c, { blanks });
    }
  }, [markerCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAccepted = (i: number, csv: string) =>
    onChange(c, { blanks: k.blanks.map((b, j) => (j === i ? { accepted: csv.split(',').map((s) => s.trim()).filter(Boolean) } : b)) });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Add <code>___</code> markers in the stimulus text above. {markerCount} blank(s) detected.</p>
      {k.blanks.map((b, i) => (
        <div key={i}>
          <label className="block text-xs text-foreground/70 mb-1">Blank {i + 1} — accepted answers (comma-separated)</label>
          <input value={b.accepted.join(', ')} onChange={(e) => setAccepted(i, e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm" placeholder="COUNTROWS, COUNTROWS()" />
        </div>
      ))}
    </div>
  );
}
