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

  async function fetchSubmissions(currentPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTestConfigId) params.set('testConfigId', filterTestConfigId);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      if (filterDifficulty) params.set('difficulty', filterDifficulty);
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
    setTimeout(() => fetchSubmissions(1), 0);
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
          className="rounded border-gray-300"
        />
      ),
    },
    {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
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
        <span className="text-sm">{row.original.test_name} <span className="text-gray-400 capitalize">— {row.original.difficulty}</span></span>
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
          className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
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
          className="text-blue-600 hover:underline text-xs"
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
        <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
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
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Test config</label>
          <select
            value={filterTestConfigId}
            onChange={e => setFilterTestConfigId(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="">All tests</option>
            {testConfigs.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.name} — {tc.difficulty}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 capitalize"
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
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Aggregate stats panel */}
      {filterTestConfigId && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
          {statsLoading ? (
            <p className="text-sm text-gray-400">Loading stats…</p>
          ) : stats ? (
            <div>
              <div className="flex gap-8 mb-4">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.total_submissions}</div>
                  <div className="text-xs text-gray-500">Total submissions</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.avg_score_pct}%</div>
                  <div className="text-xs text-gray-500">Average score</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.pass_rate_pct}%</div>
                  <div className="text-xs text-gray-500">Pass rate</div>
                </div>
              </div>
              <div className="text-xs font-medium text-gray-500 mb-2">Score distribution</div>
              <div className="space-y-1">
                {BUCKETS.map(({ label, key }) => {
                  const count = stats[key] as number;
                  const pct = Math.round((count / maxBucket) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="w-14 text-right text-gray-500">{label}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-gray-600">{count}</span>
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
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 text-gray-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                      No submissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparison sticky footer */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-gray-600">{selectedIds.size} candidates selected</span>
          <button
            onClick={handleCompare}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Compare selected ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
}
