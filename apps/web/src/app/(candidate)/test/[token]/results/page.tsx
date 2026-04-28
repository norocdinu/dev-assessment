'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { SubmissionResult } from '@dev-assessment/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function getOptionText(row: { option_a: string; option_b: string; option_c: string; option_d: string }, key: 'a' | 'b' | 'c' | 'd'): string {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading your results…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <p className="text-gray-700 mb-4">{error || 'Results not available.'}</p>
          <p className="text-sm text-gray-500">
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

  const passClass = result.pass
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700';

  const skillAreaEntries = Object.entries(result.skill_area_scores);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <span className="text-sm font-semibold text-gray-800">Dev Assessment</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {result.test_name}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${passClass}`}>
              {result.pass ? 'PASS' : 'FAIL'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">{result.score_pct}%</p>
              <p className="text-xs text-gray-500 mt-1">Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{formatTime(result.time_taken_seconds)}</p>
              <p className="text-xs text-gray-500 mt-1">Time taken</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{submittedDate}</p>
              <p className="text-xs text-gray-500 mt-1">Submitted</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400 text-center">
            Pass threshold: {result.pass_threshold_pct}%
          </p>
        </div>

        {/* Skill Breakdown */}
        {skillAreaEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Skill Breakdown</h2>
            <div className="divide-y divide-gray-100">
              {skillAreaEntries.map(([area, score]) => (
                <div key={area} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{area}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {score.correct} / {score.total}
                    </span>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {score.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer Sheet */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Answer Sheet</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Question</th>
                  <th className="pb-2 pr-4 font-medium">Your Answer</th>
                  <th className="pb-2 pr-4 font-medium">Correct Answer</th>
                  <th className="pb-2 pr-4 font-medium">Skill Area</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.answer_sheet.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-4 text-gray-700 max-w-xs">{row.question_text}</td>
                    <td className="py-2 pr-4 text-gray-700">
                      {row.candidate_answer
                        ? `${row.candidate_answer.toUpperCase()}. ${getOptionText(row, row.candidate_answer)}`
                        : <span className="text-gray-400 italic">No answer</span>}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {row.correct_option.toUpperCase()}. {getOptionText(row, row.correct_option)}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{row.skill_area}</td>
                    <td className="py-2 text-center">
                      {row.is_correct ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-red-500 font-bold">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
