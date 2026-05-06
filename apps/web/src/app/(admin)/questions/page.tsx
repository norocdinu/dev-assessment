'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { api } from '@/lib/api';
import type { Question, Technology } from '@dev-assessment/shared';
import { toast } from 'sonner';

interface QuestionRow extends Question {
  technology_name: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [technology, setTechnology] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [skillArea, setSkillArea] = useState('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [historyModal, setHistoryModal] = useState<QuestionRow[] | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<{ imported: number; errors: Array<{ row: number; reason: string }> } | null>(null);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteBlocked, setBulkDeleteBlocked] = useState<Array<{ id: string; count: number }>>([]);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const debouncedSearch = useDebounce(search, 300);
  const debouncedSkillArea = useDebounce(skillArea, 300);

  useEffect(() => {
    api.get('/auth/me').then((r) => setUserRole(r.data.user.role)).catch(() => {});
    api.get('/technologies').then((r) => setTechnologies(r.data)).catch(() => {});
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (technology) params.set('technology', technology);
      if (difficulty) params.set('difficulty', difficulty);
      if (debouncedSkillArea) params.set('skill_area', debouncedSkillArea);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (showArchived) params.set('include_archived', 'true');
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      const res = await api.get(`/questions?${params}`);
      setQuestions(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [technology, difficulty, debouncedSkillArea, debouncedSearch, showArchived, page]);

  useEffect(() => {
    setPage(1);
  }, [technology, difficulty, debouncedSkillArea, debouncedSearch, showArchived]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  async function handleArchive(familyId: string) {
    if (!confirm('Archive this question?')) return;
    try {
      await api.delete(`/questions/${familyId}`);
      toast.success('Question archived');
      fetchQuestions();
    } catch {
      toast.error('Failed to archive question');
    }
  }

  async function handleHistory(familyId: string) {
    try {
      const res = await api.get(`/questions/${familyId}/versions`);
      setHistoryModal(res.data);
    } catch {
      toast.error('Failed to load version history');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/questions/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      if (res.data.imported > 0) fetchQuestions();
    } catch {
      setImportResult({ imported: 0, errors: [{ row: 0, reason: 'Upload failed. Check file format.' }] });
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    try {
      const params = new URLSearchParams();
      if (technology) params.set('technology', technology);
      if (difficulty) params.set('difficulty', difficulty);
      if (debouncedSkillArea) params.set('skill_area', debouncedSkillArea);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (showArchived) params.set('include_archived', 'true');
      const res = await api.get(`/questions/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questions-export.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export started');
    } catch {
      // error handled silently — file download failure is obvious to the user
    }
  }

  function toggleSelect(familyId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId);
      else next.add(familyId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === questions.length && questions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.family_id)));
    }
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds);
    try {
      const res = await api.patch('/questions/bulk-archive', { ids });
      toast.success(`${res.data.archived} question${res.data.archived !== 1 ? 's' : ''} archived`);
      setSelectedIds(new Set());
      fetchQuestions();
    } catch {
      toast.error('Failed to archive questions');
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} question${selectedIds.size !== 1 ? 's' : ''} permanently? This cannot be undone.`)) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await api.post('/questions/bulk-delete', { ids });
      if (res.data.deleted > 0) {
        toast.success(`${res.data.deleted} question${res.data.deleted !== 1 ? 's' : ''} deleted`);
      }
      if (res.data.blocked.length > 0) {
        setBulkDeleteBlocked(res.data.blocked);
      } else {
        setBulkDeleteBlocked([]);
      }
      setSelectedIds(new Set());
      fetchQuestions();
    } catch {
      toast.error('Failed to delete questions');
    }
  }

  async function handleHardDelete(familyId: string) {
    if (!window.confirm('Delete this question permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/questions/${familyId}/hard`);
      toast.success('Question deleted');
      setDeleteErrors(prev => { const next = { ...prev }; delete next[familyId]; return next; });
      fetchQuestions();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 409) {
        const msg = axiosErr.response?.data?.message ?? 'This question was used in past submissions and cannot be deleted. Archive it to hide it from future tests.';
        setDeleteErrors(prev => ({ ...prev, [familyId]: msg }));
      } else {
        toast.error('Failed to delete question');
      }
    }
  }

  const isOwner = userRole === 'owner';

  const columns: ColumnDef<QuestionRow>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === questions.length && questions.length > 0}
          onChange={toggleSelectAll}
          className="rounded border-gray-300"
        />
      ),
      cell: ({ row }: { row: Row<QuestionRow> }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.family_id)}
          onChange={() => toggleSelect(row.original.family_id)}
          className="rounded border-gray-300"
        />
      ),
    },
    { header: 'Technology', accessorKey: 'technology_name' },
    { header: 'Difficulty', accessorKey: 'difficulty', cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span> },
    { header: 'Skill Area', accessorKey: 'skill_area' },
    {
      header: 'Question',
      accessorKey: 'text',
      cell: ({ getValue }) => {
        const t = getValue<string>();
        return t.length > 80 ? t.slice(0, 80) + '…' : t;
      },
    },
    { header: 'v', accessorKey: 'version' },
    {
      header: 'Status',
      cell: ({ row }) => (
        <span className={row.original.is_active ? 'text-green-600' : 'text-gray-400'}>
          {row.original.is_active ? 'Active' : 'Archived'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div>
          <div className="flex gap-2">
            {isOwner && (
              <button
                onClick={() => router.push(`/questions/${row.original.family_id}/edit`)}
                className="text-blue-600 hover:underline text-xs"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => handleHistory(row.original.family_id)}
              className="text-gray-600 hover:underline text-xs"
            >
              History
            </button>
            {isOwner && row.original.is_active && (
              <button
                onClick={() => handleArchive(row.original.family_id)}
                className="text-orange-600 hover:underline text-xs"
              >
                Archive
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => handleHardDelete(row.original.family_id)}
                className="text-red-600 hover:underline text-xs"
              >
                Delete
              </button>
            )}
          </div>
          {deleteErrors[row.original.family_id] && (
            <p className="text-xs text-red-600 mt-1 max-w-xs">{deleteErrors[row.original.family_id]}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Question Bank</h2>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm rounded-md border text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Export CSV
            </button>
            <label className={`px-4 py-2 text-sm rounded-md border cursor-pointer ${importing ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
              {importing ? 'Importing…' : 'Import CSV'}
              <input type="file" accept=".csv" className="hidden" disabled={importing} onChange={handleImport} />
            </label>
            <button
              onClick={() => router.push('/questions/new')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              New Question
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Technologies</option>
          {technologies.map((t) => (
            <option key={t.id} value={t.slug}>{t.name}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Levels</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
        </select>
        <input
          type="text"
          placeholder="Skill area..."
          value={skillArea}
          onChange={(e) => setSkillArea(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 min-w-40"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm font-medium text-gray-900 mb-2">
            Import complete: {importResult.imported} question{importResult.imported !== 1 ? 's' : ''} imported
            {importResult.errors.length > 0 && `, ${importResult.errors.length} error${importResult.errors.length !== 1 ? 's' : ''}`}
          </div>
          {importResult.errors.length > 0 && (
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">Row</th>
                  <th className="px-3 py-2 text-left text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody>
                {importResult.errors.map((e, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-700">{e.row || '—'}</td>
                    <td className="px-3 py-2 text-red-600">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={() => setImportResult(null)} className="mt-2 text-xs text-gray-400 hover:underline">Dismiss</button>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-2">
        {loading ? 'Loading...' : `${total} question${total !== 1 ? 's' : ''} total`}
      </p>

      <DataTable
        columns={columns}
        data={questions}
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {/* Bulk delete blocked warning */}
      {bulkDeleteBlocked.length > 0 && (
        <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <p className="font-medium text-yellow-800 mb-1">Some questions could not be deleted:</p>
          <ul className="list-disc list-inside text-yellow-700 space-y-0.5">
            {bulkDeleteBlocked.map(b => (
              <li key={b.id}>Question <code className="font-mono text-xs">{b.id.slice(0, 8)}…</code> — used in {b.count} submission{b.count !== 1 ? 's' : ''}. Archive it to hide it from future tests.</li>
            ))}
          </ul>
          <button onClick={() => setBulkDeleteBlocked([])} className="mt-2 text-xs text-yellow-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Bulk action floating bar */}
      {selectedIds.size >= 1 && isOwner && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-gray-600">{selectedIds.size} question{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkArchive}
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
            >
              Archive {selectedIds.size} selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              Delete {selectedIds.size} selected
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setHistoryModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Version History</h3>
            <div className="space-y-2">
              {historyModal.map((q) => (
                <div key={q.id} className="border border-gray-200 rounded p-3 text-sm">
                  <div className="font-medium">v{q.version} {q.is_latest ? '(current)' : ''}</div>
                  <div className="text-gray-600 mt-1">{q.text}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(q.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryModal(null)} className="mt-4 text-sm text-gray-600 hover:underline">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
