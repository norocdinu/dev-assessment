'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { SubmissionResult } from '@dev-assessment/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Dev Assessment';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-border border-t-[var(--brand)] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted">Loading your results…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-md w-full text-center">
          <p className="text-foreground mb-3">{error || 'Results not available.'}</p>
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <span className="text-base font-bold text-foreground">{BRAND_NAME}</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Thank-you header */}
        <div className="text-center py-4">
          <p className="text-sm text-muted mb-1">Assessment complete</p>
          <h1 className="text-2xl font-bold text-foreground">Thank you for completing the test</h1>
          <p className="text-sm text-muted mt-2">Here is a summary of your performance.</p>
        </div>

        {/* Pass/Fail banner */}
        <div
          className={`rounded-2xl p-6 text-center ${
            result.pass
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}
        >
          <span
            className={`text-4xl font-black tracking-wide ${
              result.pass ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {result.pass ? 'PASS' : 'FAIL'}
          </span>
          <div className="mt-3 flex items-center justify-center gap-8">
            <div>
              <p className="text-3xl font-bold text-foreground">{result.score_pct}%</p>
              <p className="text-xs text-muted mt-0.5">Score</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-lg font-semibold text-foreground">{formatTime(result.time_taken_seconds)}</p>
              <p className="text-xs text-muted mt-0.5">Time taken</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-sm font-medium text-foreground">{submittedDate}</p>
              <p className="text-xs text-muted mt-0.5">Submitted</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Pass threshold: {result.pass_threshold_pct}%</p>
        </div>

        {/* Skill Breakdown */}
        {skillAreaEntries.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Skill Breakdown</h2>
            <div className="divide-y divide-border">
              {skillAreaEntries.map(([area, score]) => (
                <div key={area} className="flex items-center justify-between py-3">
                  <span className="text-sm text-foreground">{area}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted">
                      {score.correct} / {score.total}
                    </span>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">
                      {score.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer Sheet */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Answer Sheet</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-border">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Question</th>
                  <th className="pb-2 pr-4 font-medium">Your Answer</th>
                  <th className="pb-2 pr-4 font-medium">Correct</th>
                  <th className="pb-2 pr-4 font-medium">Area</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.answer_sheet.map((row, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-4 text-muted">{i + 1}</td>
                    <td className="py-3 pr-4 text-foreground max-w-xs">{row.question_text}</td>
                    <td className="py-3 pr-4 text-foreground">
                      {row.candidate_answer
                        ? `${row.candidate_answer.toUpperCase()}. ${getOptionText(row, row.candidate_answer)}`
                        : <span className="text-muted italic">No answer</span>}
                    </td>
                    <td className="py-3 pr-4 text-foreground">
                      {row.correct_option.toUpperCase()}. {getOptionText(row, row.correct_option)}
                    </td>
                    <td className="py-3 pr-4 text-muted text-xs">{row.skill_area}</td>
                    <td className="py-3 text-center">
                      {row.is_correct
                        ? <span className="text-emerald-500 font-bold text-base">✓</span>
                        : <span className="text-red-400 font-bold text-base">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-muted pb-4">
          That's it — you can close this tab now.
        </p>
      </div>
    </div>
  );
}
