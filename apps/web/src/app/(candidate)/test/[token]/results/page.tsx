'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Brandmark } from '@/components/candidate/Brandmark';
import type { SubmissionResult } from '@dev-assessment/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function getOptionText(
  row: { option_a: string; option_b: string; option_c: string; option_d: string },
  key: 'a' | 'b' | 'c' | 'd'
): string {
  const map = { a: row.option_a, b: row.option_b, c: row.option_c, d: row.option_d };
  return map[key];
}

export default function ResultsPage() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/candidate/results/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Results not available.');
          return;
        }
        const data = await res.json();
        setResult(data);
      })
      .catch(() => setError('Failed to load results. Please check your connection.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="candidate-shell flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-[var(--brand)]" />
          <p className="mt-5 font-serif text-lg italic text-muted">Tallying your results…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="candidate-shell flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="mb-2 font-serif text-xl text-foreground">{error || 'Results not available.'}</p>
          <p className="text-sm text-muted">
            If you have not yet submitted, please return to the test page.
          </p>
        </div>
      </div>
    );
  }

  const submittedDate = new Date(result.submitted_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const skillAreaEntries = Object.entries(result.skill_area_scores);

  const correctTotal = result.answer_sheet.filter((r) => r.is_correct).length;

  return (
    <div className="candidate-shell">
      <header className="border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Brandmark />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-7 px-4 py-10 sm:px-6 sm:py-14">
        {/* Completion header */}
        <header className="anim-rise">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
            Assessment complete
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.015em] text-foreground sm:text-[2.5rem] sm:leading-[1.1]">
            Thank you for completing the test.
          </h1>
          <p className="mt-3 text-[15px] text-muted">Here is a summary of how you performed.</p>
        </header>

        {/* Verdict panel */}
        <section
          className="anim-rise overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_44px_-24px_rgb(0_0_0/0.18)]"
          style={{ ['--d' as string]: '80ms' }}
        >
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                  result.pass
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-danger/30 bg-danger/10 text-danger'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${result.pass ? 'bg-success' : 'bg-danger'}`}
                />
                {result.pass ? 'Passed' : 'Not passed'}
              </span>
              <p className="mt-4 text-sm text-muted">
                Pass threshold is{' '}
                <span className="font-medium text-foreground">{result.pass_threshold_pct}%</span>.
              </p>
            </div>
            <div className="flex items-baseline gap-1 sm:flex-col sm:items-end">
              <span
                className={`font-serif text-6xl font-medium leading-none tracking-[-0.02em] tabular-nums sm:text-7xl ${
                  result.pass ? 'text-foreground' : 'text-foreground'
                }`}
              >
                {result.score_pct}
              </span>
              <span className="font-mono text-sm text-muted sm:mt-2">% score</span>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 border-t border-border divide-x divide-border">
            <div className="px-5 py-4 text-center sm:px-6">
              <p className="font-mono text-lg font-medium tabular-nums text-foreground">
                {correctTotal}/{result.answer_sheet.length}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Correct</p>
            </div>
            <div className="px-5 py-4 text-center sm:px-6">
              <p className="font-mono text-lg font-medium tabular-nums text-foreground">
                {formatTime(result.time_taken_seconds)}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Time</p>
            </div>
            <div className="px-5 py-4 text-center sm:px-6">
              <p className="text-sm font-medium text-foreground">{submittedDate}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Submitted</p>
            </div>
          </div>
        </section>

        {/* Skill breakdown — horizontal meters */}
        {skillAreaEntries.length > 0 && (
          <section
            className="anim-rise rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            style={{ ['--d' as string]: '160ms' }}
          >
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Skill breakdown
            </h2>
            <div className="mt-5 space-y-5">
              {skillAreaEntries.map(([area, score]) => (
                <div key={area}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{area}</span>
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {score.correct}/{score.total} · <span className="text-foreground">{score.pct}%</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-700 ease-out"
                      style={{ width: `${score.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Answer sheet */}
        <section
          className="anim-rise overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          style={{ ['--d' as string]: '220ms' }}
        >
          <h2 className="border-b border-border px-6 py-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted sm:px-8">
            Answer sheet
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  <th className="py-3 pl-6 pr-3 font-medium sm:pl-8">#</th>
                  <th className="py-3 pr-4 font-medium">Question</th>
                  <th className="py-3 pr-4 font-medium">Your answer</th>
                  <th className="py-3 pr-4 font-medium">Correct</th>
                  <th className="py-3 pr-6 text-right font-medium sm:pr-8">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.answer_sheet.map((row, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-4 pl-6 pr-3 font-mono text-xs text-muted sm:pl-8">
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className="max-w-xs py-4 pr-4 text-foreground">{row.question_text}</td>
                    <td className="py-4 pr-4">
                      {row.candidate_answer ? (
                        <span className={row.is_correct ? 'text-foreground' : 'text-danger'}>
                          <span className="font-mono font-medium">{row.candidate_answer.toUpperCase()}.</span>{' '}
                          {getOptionText(row, row.candidate_answer)}
                        </span>
                      ) : (
                        <span className="italic text-muted">No answer</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-foreground">
                      <span className="font-mono font-medium">{row.correct_option.toUpperCase()}.</span>{' '}
                      {getOptionText(row, row.correct_option)}
                    </td>
                    <td className="py-4 pr-6 text-right sm:pr-8">
                      {row.is_correct ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Wrong
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="pb-2 text-center font-serif text-base italic text-muted">
          That's everything — you can safely close this tab now.
        </p>
      </main>
    </div>
  );
}
