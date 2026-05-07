'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { api } from '@/lib/api';
import type { TestLink } from '@dev-assessment/shared';

export default function LinksPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [links, setLinks] = useState<TestLink[]>([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [candidateName, setCandidateName] = useState('');

  useEffect(() => {
    api.get('/auth/me').then((r) => setUserRole(r.data.user.role)).catch(() => {});
    fetchLinks();
  }, [id]);

  async function fetchLinks() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/test-links/${id}`);
      setLinks(res.data);
    } catch {
      setError('Failed to load links.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setGeneratedUrl('');
    try {
      const res = await api.post('/admin/test-links', {
        test_config_id: id,
        candidate_name: candidateName || undefined,
      });
      setGeneratedUrl(res.data.url);
      setCandidateName('');
      fetchLinks();
    } catch {
      setError('Failed to generate link. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(linkId: string) {
    if (!confirm('Revoke this link? Candidates with this link will no longer be able to start a test.')) return;
    try {
      await api.delete(`/admin/test-links/${linkId}`);
      setGeneratedUrl('');
      fetchLinks();
    } catch {
      setError('Failed to revoke link. Please try again.');
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — user can manually select the input
    }
  }

  const isOwner = userRole === 'owner';
  const isMember = userRole === 'member';

  const columns: ColumnDef<TestLink>[] = [
    {
      header: 'Candidate',
      accessorKey: 'candidate_name',
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    },
    {
      header: 'Token',
      accessorKey: 'token',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-gray-600">
          {getValue<string>().substring(0, 8)}…
        </span>
      ),
    },
    {
      header: 'State',
      accessorKey: 'state',
      cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span>,
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      header: 'Started',
      accessorKey: 'started_at',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? new Date(v).toLocaleDateString() : '—';
      },
    },
    {
      header: 'Submitted',
      accessorKey: 'submitted_at',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? new Date(v).toLocaleDateString() : '—';
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: { row: { original: TestLink } }) => (
        <div className="flex gap-2">
          {row.original.state === 'submitted' && (
            <button
              onClick={() => router.push(`/admin/submissions/${row.original.id}`)}
              className="text-blue-600 hover:underline text-xs"
            >
              View result
            </button>
          )}
          {isOwner && row.original.state !== 'submitted' && row.original.state !== 'expired' && (
            <button
              onClick={() => handleRevoke(row.original.id)}
              className="text-red-600 hover:underline text-xs"
            >
              Revoke
            </button>
          )}
        </div>
      ),
    } as ColumnDef<TestLink>,
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Test Links</h2>
        {(isOwner || isMember) && (
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
              <input
                type="text"
                placeholder="Optional"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate New Link'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      {generatedUrl && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-gray-700 mb-2">
            New link generated — share this URL with the candidate:
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={generatedUrl}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white font-mono"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <DataTable columns={columns} data={links} />
      )}
    </div>
  );
}
