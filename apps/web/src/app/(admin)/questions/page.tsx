'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { api } from '@/lib/api';
import type { Question, Technology } from '@dev-assessment/shared';

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
      const res = await api.get(`/questions?${params}`);
      setQuestions(res.data);
    } finally {
      setLoading(false);
    }
  }, [technology, difficulty, debouncedSkillArea, debouncedSearch, showArchived]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  async function handleArchive(familyId: string) {
    if (!confirm('Archive this question?')) return;
    await api.delete(`/questions/${familyId}`);
    fetchQuestions();
  }

  async function handleHistory(familyId: string) {
    const res = await api.get(`/questions/${familyId}/versions`);
    setHistoryModal(res.data);
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

  const isOwner = userRole === 'owner';

  const columns: ColumnDef<QuestionRow>[] = [
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
              className="text-red-600 hover:underline text-xs"
            >
              Archive
            </button>
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
        {loading ? 'Loading...' : `Showing ${questions.length} question${questions.length !== 1 ? 's' : ''}`}
      </p>

      <DataTable columns={columns} data={questions} />

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
