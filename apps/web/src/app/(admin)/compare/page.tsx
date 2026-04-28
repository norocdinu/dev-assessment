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

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to submissions
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Candidate Comparison</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-40">Field</th>
              {results.map((r, i) => (
                <th key={r.link_id} className="px-4 py-3 text-left font-medium text-gray-600">
                  Candidate {i + 1}
                  <div className="text-xs text-gray-400 font-normal">{r.test_name} — {r.difficulty}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-500 font-medium">Score</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3 font-semibold text-gray-900">{r.score_pct}%</td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <td className="px-4 py-3 text-gray-500 font-medium">Pass/Fail</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${r.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.pass ? 'Pass' : 'Fail'}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-500 font-medium">Time taken</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3 text-gray-700">{fmtTime(r.time_taken_seconds)}</td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <td className="px-4 py-3 text-gray-500 font-medium">Submitted</td>
              {results.map(r => (
                <td key={r.link_id} className="px-4 py-3 text-gray-700">{new Date(r.submitted_at).toLocaleDateString()}</td>
              ))}
            </tr>

            {/* Skill area breakdown */}
            {allSkillAreas.length > 0 && (
              <tr>
                <td colSpan={results.length + 1} className="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Skill Area Breakdown
                </td>
              </tr>
            )}
            {allSkillAreas.map((area, idx) => (
              <tr key={area} className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                <td className="px-4 py-3 text-gray-500">{area}</td>
                {results.map(r => {
                  const s = r.skill_area_scores?.[area];
                  if (!s) return <td key={r.link_id} className="px-4 py-3 text-gray-400">—</td>;
                  return (
                    <td key={r.link_id} className="px-4 py-3 text-gray-700">
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
