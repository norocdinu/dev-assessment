'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';

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

interface TestConfigOption {
  id: string;
  name: string;
  difficulty: string;
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-7 w-32" />

      {/* KPI strip skeleton — 4 cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>

      {/* Recent submissions skeleton */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [competency, setCompetency] = useState<CompetencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [testConfigId, setTestConfigId]   = useState<string>('');
  const [datePreset, setDatePreset]       = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
  const [customFrom, setCustomFrom]       = useState<string>('');
  const [customTo, setCustomTo]           = useState<string>('');
  const [testConfigs, setTestConfigs]     = useState<TestConfigOption[]>([]);
  const [configsError, setConfigsError]   = useState(false);

  function computeDateRange(): { from?: string; to?: string } {
    const now = new Date();
    if (datePreset === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      return { from: d.toISOString(), to: now.toISOString() };
    }
    if (datePreset === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { from: d.toISOString(), to: now.toISOString() };
    }
    if (datePreset === '90d') {
      const d = new Date(now); d.setDate(d.getDate() - 90);
      return { from: d.toISOString(), to: now.toISOString() };
    }
    if (datePreset === 'custom') {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return {};
  }

  useEffect(() => {
    api.get('/test-configs')
      .then(r => setTestConfigs(r.data))
      .catch(() => setConfigsError(true));
  }, []);

  const fetchData = useCallback(() => {
    // Guard: if custom preset but dates not yet both filled, skip fetch
    if (datePreset === 'custom' && (!customFrom || !customTo)) return;

    setLoading(true);
    setError('');
    const dateRange = computeDateRange();
    const params = {
      ...(testConfigId ? { testConfigId } : {}),
      ...(dateRange.from ? { from: dateRange.from } : {}),
      ...(dateRange.to   ? { to: dateRange.to }     : {}),
    };

    Promise.all([
      api.get('/dashboard/stats',      { params }),
      api.get('/dashboard/competency', { params }),
    ])
      .then(([statsRes, competencyRes]) => {
        setStats(statsRes.data);
        setCompetency(competencyRes.data);
      })
      .catch(() => setError('Failed to load dashboard data. Try again.'))
      .finally(() => setLoading(false));
  }, [testConfigId, datePreset, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!stats && !error) {
    return null;
  }
  if (!stats && error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-lg">
        {/* Test config filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wide">Test config</label>
          <select
            value={testConfigId}
            onChange={e => setTestConfigId(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
          >
            <option value="">All configurations</option>
            {configsError && (
              <option value="" disabled>Failed to load configurations</option>
            )}
            {testConfigs.map(tc => (
              <option key={tc.id} value={tc.id}>
                {tc.name} ({tc.difficulty})
              </option>
            ))}
          </select>
        </div>

        {/* Date range filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-wide">Date range</label>
          <select
            value={datePreset}
            onChange={e => setDatePreset(e.target.value as 'all' | '7d' | '30d' | '90d' | 'custom')}
            className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>
        </div>

        {/* Custom date inputs — shown only when preset is custom */}
        {datePreset === 'custom' && (
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-muted mb-1">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">To</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {/* Re-fetch error (shown below filter bar, above KPI cards) */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* KPI Strip — 4 cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Total Candidates</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats!.totalCandidates}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Pass Rate</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats!.passRate}%</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Average Score</p>
          <p className="text-3xl font-bold text-foreground mt-1">{stats!.avgScore}%</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Weakest Skill Area</p>
          <p className="text-base font-semibold text-foreground mt-1 truncate">
            {stats!.weakestSkillArea ?? '—'}
          </p>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Score Distribution</h2>
        <ScoreDistributionChart
          bucket0_49={stats!.bucket0_49}
          bucket50_59={stats!.bucket50_59}
          bucket60_69={stats!.bucket60_69}
          bucket70_79={stats!.bucket70_79}
          bucket80_89={stats!.bucket80_89}
          bucket90_100={stats!.bucket90_100}
        />
      </div>

      {/* Competency Breakdown Chart */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Competency Breakdown</h2>
        <CompetencyChart data={competency} />
      </div>

      {/* Recent Candidates Table */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Candidates</h2>
        {stats!.recentSubmissions.length === 0 ? (
          <p className="text-sm text-muted/70">No submissions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-4 text-xs font-medium text-muted uppercase tracking-wide">Candidate</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-muted uppercase tracking-wide">Test</th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-muted uppercase tracking-wide">Score</th>
                <th className="text-center py-2 pr-4 text-xs font-medium text-muted uppercase tracking-wide">Result</th>
                <th className="text-left py-2 text-xs font-medium text-muted uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stats!.recentSubmissions.map((sub, i) => (
                <tr key={i}>
                  <td className="py-2 pr-4 text-foreground/80">{sub.candidateName ?? '—'}</td>
                  <td className="py-2 pr-4 text-muted">{sub.testConfigName}</td>
                  <td className="py-2 pr-4 text-right font-medium text-foreground">{sub.scorePct}%</td>
                  <td className="py-2 pr-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sub.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {sub.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td className="py-2 text-muted">
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
