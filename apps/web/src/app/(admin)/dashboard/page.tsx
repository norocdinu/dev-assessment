'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';

const ScoreDistributionChart = dynamic(() => import('./ScoreDistributionChart'), { ssr: false });
const CompetencyChart = dynamic(() => import('./CompetencyChart'), { ssr: false });

interface DashboardStats {
  totalCandidates: number;
  passRate: number;
  avgScore: number;
  weakestSkillArea: string | null;
  bucket0_49: number;
  bucket50_59: number;
  bucket60_69: number;
  bucket70_79: number;
  bucket80_89: number;
  bucket90_100: number;
  recentSubmissions: Array<{
    candidateName: string | null;
    scorePct: number;
    pass: boolean;
    submittedAt: string;
    testConfigName: string;
  }>;
}

interface CompetencyItem {
  area: string;
  avgScore: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [competency, setCompetency] = useState<CompetencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/competency'),
    ])
      .then(([statsRes, competencyRes]) => {
        setStats(statsRes.data);
        setCompetency(competencyRes.data);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || 'Failed to load dashboard.'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      {/* KPI Strip — 4 cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Candidates</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCandidates}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pass Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.passRate}%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Average Score</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgScore}%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Weakest Skill Area</p>
          <p className="text-base font-semibold text-gray-900 mt-1 truncate">
            {stats.weakestSkillArea ?? '—'}
          </p>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Score Distribution</h2>
        <ScoreDistributionChart
          bucket0_49={stats.bucket0_49}
          bucket50_59={stats.bucket50_59}
          bucket60_69={stats.bucket60_69}
          bucket70_79={stats.bucket70_79}
          bucket80_89={stats.bucket80_89}
          bucket90_100={stats.bucket90_100}
        />
      </div>

      {/* Competency Breakdown Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Competency Breakdown</h2>
        <CompetencyChart data={competency} />
      </div>

      {/* Recent Candidates Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Candidates</h2>
        {stats.recentSubmissions.length === 0 ? (
          <p className="text-sm text-gray-400">No submissions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Test</th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-center py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Result</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentSubmissions.map((sub, i) => (
                <tr key={i}>
                  <td className="py-2 pr-4 text-gray-700">{sub.candidateName ?? '—'}</td>
                  <td className="py-2 pr-4 text-gray-500">{sub.testConfigName}</td>
                  <td className="py-2 pr-4 text-right font-medium text-gray-900">{sub.scorePct}%</td>
                  <td className="py-2 pr-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sub.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {sub.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">
                    {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
