'use client';
import type { AnswerSheetRow, Block } from '@dev-assessment/shared';
import { PromptRenderer } from './PromptRenderer';

function describe(row: AnswerSheetRow): { yours: string; correct: string } {
  const c = row.content as any; const k = row.answer_key as any; const r = row.response as any;
  switch (row.type) {
    case 'single_choice': return { yours: c.options?.[r?.index] ?? '—', correct: c.options?.[k.correctIndex] ?? '' };
    case 'multi_select': return {
      yours: (r?.indices ?? []).map((i: number) => c.options[i]).join(', ') || '—',
      correct: (k.correctIndices ?? []).map((i: number) => c.options[i]).join(', '),
    };
    case 'true_false': return { yours: r ? String(r.value) : '—', correct: String(k.correct) };
    case 'matching': return {
      yours: c.left.map((l: string, i: number) => `${l}→${c.right[r?.map?.[i]] ?? '?'}`).join('; '),
      correct: c.left.map((l: string, i: number) => `${l}→${c.right[k.map[i]]}`).join('; '),
    };
    case 'ordering': return {
      yours: (r?.order ?? []).map((i: number) => c.items[i]).join(' → ') || '—',
      correct: k.order.map((i: number) => c.items[i]).join(' → '),
    };
    case 'fill_blank': return {
      yours: (r?.values ?? []).join(' | ') || '—',
      correct: k.blanks.map((b: any) => b.accepted[0]).join(' | '),
    };
  }
  return { yours: '—', correct: '' };
}

export function AnswerSheetItem({ row }: { row: AnswerSheetRow }) {
  const { yours, correct } = describe(row);
  const prompt = (row.content as { prompt: Block[] }).prompt;
  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{row.type.replace('_', ' ')} · {row.skill_area}</span>
        <span className={row.is_correct ? 'text-green-600' : 'text-red-600'}>{row.is_correct ? '✓ Correct' : '✗ Incorrect'}</span>
      </div>
      <PromptRenderer prompt={prompt} />
      <p className="text-sm"><span className="text-muted">Your answer:</span> {yours}</p>
      {!row.is_correct && <p className="text-sm"><span className="text-muted">Correct:</span> {correct}</p>}
    </div>
  );
}
