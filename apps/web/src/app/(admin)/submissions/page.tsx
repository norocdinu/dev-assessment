'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Row,
} from '@tanstack/react-table';
import { api } from '@/lib/api';
import type { SubmissionListRow, TestConfig, TestConfigStats } from '@dev-assessment/shared';

interface TestConfigOption extends TestConfig {
  technology_name: string;
}

const BUCKETS: Array<{ label: string; key: keyof TestConfigStats }> = [
  { label: '0–49', key: 'bucket_0_49' },
  { label: '50–59', key: 'bucket_50_59' },
  { label: '60–69', key: 'bucket_60_69' },
  { label: '70–79', key: 'bucket_70_79' },
  { label: '80–89', key: 'bucket_80_89' },
  { label: '90–100', key: 'bucket_90_100' },
];

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<SubmissionListRow[]>([]);
  const [testConfigs, setTestConfigs] = useState<TestConfigOption[]>([]);
  const [stats, setStats] = useState<TestConfigStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filters
  const [filterTestConfigId, setFilterTestConfigId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  // Comparison selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [sorting, setSorting] = useState<SortingState>([{ id: 'submitted_at', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.get('/test-configs').then((r) => setTestConfigs(r.data)).catch(() => {});
    fetchSubmissions(1);
  }, []);

  async function fetchSubmissions(currentPage = page, opts?: { testConfigId?: string; dateFrom?: string; dateTo?: string; difficulty?: string }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const tcId = opts !== undefined ? opts.testConfigId ?? '' : filterTestConfigId;
      const from = opts !== undefined ? opts.dateFrom ?? '' : filterDateFrom;
      const to = opts !== undefined ? opts.dateTo ?? '' : filterDateTo;
      const diff = opts !== undefined ? opts.difficulty ?? '' : filterDifficulty;
      if (tcId) params.set('testConfigId', tcId);
      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);
      if (diff) params.set('difficulty', diff);
      params.set('page', String(currentPage));
      params.set('pageSize', String(PAGE_SIZE));
      const res = await api.get(`/admin/submissions?${params}`);
      setSubmissions(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!filterTestConfigId) { setStats(null); return; }
    setStatsLoading(true);
    api.get(`/admin/stats/${filterTestConfigId}`)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [filterTestConfigId]);

  function applyFilters() {
    setPage(1);
    fetchSubmissions(1);
    setSelectedIds(new Set());
  }

  function clearFilters() {
    setFilterTestConfigId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterDifficulty('');
    setSelectedIds(new Set());
    setPage(1);
    fetchSubmissions(1, { testConfigId: '', dateFrom: '', dateTo: '', difficulty: '' });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchSubmissions(newPage);
  }

  async function handleExport() {
    if (!filterTestConfigId) return;
    const res = await api.get(`/admin/submissions/export?testConfigId=${filterTestConfigId}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'submissions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(linkId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(linkId)) next.delete(linkId);
      else next.add(linkId);
      return next;
    });
  }

  function handleCompare() {
    const ids = Array.from(selectedIds).join(',');
    router.push(`/compare?ids=${ids}`);
  }

  const columns: ColumnDef<SubmissionListRow>[] = [
    {
      id: 'select',
      header: '',
      cell: ({ row }: { row: Row<SubmissionListRow> }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.link_id)}
          onChange={() => toggleSelect(row.original.link_id)}
          className="rounded border-border"
        />
      ),
    },
    {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 font-medium text-foreground/70 hover:text-foreground"
        >
          Score {column.getIsSorted() === 'asc' ? '↑' : column.getIsSorted() === 'desc' ? '↓' : '↕'}
        </button>
      ),
      accessorKey: 'score_pct',
      cell: ({ getValue }) => `${getValue<number>()}%`,
    },
    {
      header: 'Pass/Fail',
      accessorKey: 'pass',
      cell: ({ getValue }) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getValue<boolean>() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {getValue<boolean>() ? 'Pass' : 'Fail'}
        </span>
      ),
    },
    {
      header: 'Test',
      accessorKey: 'test_name',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.test_name} <span className="text-muted/70 capitalize">— {row.original.difficulty}</span></span>
      ),
    },
    {
      header: 'Time',
      accessorKey: 'time_taken_seconds',
      cell: ({ getValue }) => fmtTime(getValue<number>()),
    },
    {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 font-medium text-foreground/70 hover:text-foreground"
        >
          Submitted {column.getIsSorted() === 'asc' ? '↑' : column.getIsSorted() === 'desc' ? '↓' : '↕'}
        </button>
      ),
      accessorKey: 'submitted_at',
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }: { row: Row<SubmissionListRow> }) => (
        <button
          onClick={() => router.push(`/submissions/${row.original.link_id}`)}
          className="text-[var(--brand)] hover:underline text-xs"
        >
          View result
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: submissions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    enableSortingRemoval: false,
  });

  const maxBucket = useMemo(() => {
    if (!stats) return 1;
    return Math.max(...BUCKETS.map(b => stats[b.key] as number), 1);
  }, [stats]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Submissions</h2>
        <div className="flex gap-2">
          {filterTestConfigId && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-card border border-border rounded-lg">
        <div>
          <label className="block text-xs text-muted mb-1">Test config</label>
          <select
            value={filterTestConfigId}
            onChange={e => setFilterTestConfigId(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1"
          >
            <option value="">All tests</option>
            {testConfigs.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.name} — {tc.difficulty}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Difficulty</label>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1 capitalize"
          >
            <option value="">Any</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-1.5 bg-[var(--brand)] text-white text-sm rounded-md hover:bg-[var(--brand)]/90"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-1.5 text-foreground/70 text-sm border border-border rounded-md hover:bg-muted/10"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Aggregate stats panel */}
      {filterTestConfigId && (
        <div className="mb-4 p-4 bg-card border border-border rounded-lg">
          {statsLoading ? (
            <p className="text-sm text-muted/70">Loading stats…</p>
          ) : stats ? (
            <div>
              <div className="flex gap-8 mb-4">
                <div>
                  <div className="text-2xl font-semibold text-foreground">{stats.total_submissions}</div>
                  <div className="text-xs text-muted">Total submissions</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-foreground">{stats.avg_score_pct}%</div>
                  <div className="text-xs text-muted">Average score</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-foreground">{stats.pass_rate_pct}%</div>
                  <div className="text-xs text-muted">Pass rate</div>
                </div>
              </div>
              <div className="text-xs font-medium text-muted mb-2">Score distribution</div>
              <div className="space-y-1">
                {BUCKETS.map(({ label, key }) => {
                  const count = stats[key] as number;
                  const pct = Math.round((count / maxBucket) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="w-14 text-right text-muted">{label}</span>
                      <div className="flex-1 h-4 bg-muted/20 rounded overflow-hidden">
                        <div className="h-full bg-[var(--brand)]/80 rounded" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-foreground/70">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted/70">Loading…</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/10 border-b border-border">
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 text-left font-medium text-foreground/70 whitespace-nowrap">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-border/50 hover:bg-[rgb(var(--brand-rgb))]/10 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : 'bg-card'}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 text-foreground/80">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-muted/70">
                      No submissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 mt-2 bg-card border border-border rounded-lg text-sm text-foreground/70">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 border border-border rounded-md disabled:opacity-40 hover:bg-muted/10"
            >
              Prev
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page * PAGE_SIZE >= total}
              className="px-3 py-1 border border-border rounded-md disabled:opacity-40 hover:bg-muted/10"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Comparison sticky footer */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-foreground/70">{selectedIds.size} candidates selected</span>
          <button
            onClick={handleCompare}
            className="px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-md hover:bg-[var(--brand)]/90"
          >
            Compare selected ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
}
