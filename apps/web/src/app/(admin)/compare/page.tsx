'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { SubmissionResult } from '@dev-assessment/shared';

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [results, setResults] = useState<SubmissionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ids = searchParams.get('ids') ?? '';
    if (!ids) { setError('No candidates selected.'); setLoading(false); return; }

    api.get(`/admin/submissions/compare?ids=${ids}`)
      .then(r => setResults(r.data))
      .catch(() => setError('Failed to load comparison data.'))
      .finally(() => setLoading(false));
  }, [searchParams]);

  // Collect all unique skill areas across all candidates
  const allSkillAreas = Array.from(
    new Set(results.flatMap(r => Object.keys(r.skill_area_scores ?? {})))
  ).sort();

  if (loading) return <div className="p-6 text-sm text-muted/70">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--brand)] hover:underline"
        >
          ← Back to submissions
        </button>
        <h2 className="text-lg font-semibold text-foreground">Candidate Comparison</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-muted/10 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground/70 w-40">Field</th>
              {results.map((r, i) => (
                <th key={r.link_id} className="px-4 py-3 text-left font-medium text-foreground/70">
                  Candidate {i + 1}
                  <div className="text-xs text-muted/70 font-normal">{r.test_name} — {r.difficulty}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 text-muted font-medium">Score</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3 font-semibold text-foreground">{r.score_pct}%</td>
              ))}
            </tr>
            <tr className="border-b border-border/50 bg-muted/5">
              <td className="px-4 py-3 text-muted font-medium">Pass/Fail</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${r.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.pass ? 'Pass' : 'Fail'}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 text-muted font-medium">Time taken</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3 text-foreground/80">{fmtTime(r.time_taken_seconds)}</td>
              ))}
            </tr>
            <tr className="border-b border-border/50 bg-muted/5">
              <td className="px-4 py-3 text-muted font-medium">Submitted</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3 text-foreground/80">{new Date(r.submitted_at).toLocaleDateString()}</td>
              ))}
            </tr>

            {/* Skill area breakdown */}
            {allSkillAreas.length > 0 && (
              <tr>
                <td colSpan={results.length + 1} className="px-4 py-2 bg-muted/20 text-xs font-semibold text-muted uppercase tracking-wide">
                  Skill Area Breakdown
                </td>
              </tr>
            )}
            {allSkillAreas.map((area, idx) => (
              <tr key={area} className={`border-b border-border/50 ${idx % 2 === 1 ? 'bg-muted/5' : ''}`}>
                <td className="px-4 py-3 text-muted">{area}</td>
                {results.map(r => {
                  const s = r.skill_area_scores?.[area];
                  if (!s) return <td key={r.link_id} className="px-4 py-3 text-muted/70">—</td>;
                  return (
                    <td key={r.link_id} className="px-4 py-3 text-foreground/80">
                      {s.correct}/{s.total} — {s.pct}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
