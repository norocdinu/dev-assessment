'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { api } from '@/lib/api';
import type { TestConfig } from '@dev-assessment/shared';

interface TestConfigRow extends TestConfig {
  technology_name: string;
}

export default function TestConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<TestConfigRow[]>([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then((r) => setUserRole(r.data.user.role)).catch(() => {});
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await api.get('/test-configs');
      setConfigs(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test configuration?')) return;
    await api.delete(`/test-configs/${id}`);
    fetchConfigs();
  }

  const isOwner = userRole === 'owner';

  const columns: ColumnDef<TestConfigRow>[] = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Technology', accessorKey: 'technology_name' },
    { header: 'Difficulty', accessorKey: 'difficulty', cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span> },
    { header: '# Questions', accessorKey: 'num_questions' },
    { header: 'Pass %', accessorKey: 'pass_threshold_pct', cell: ({ getValue }) => `${getValue<number>()}%` },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            title="Coming in Phase 2"
            disabled
            className="text-gray-300 text-xs cursor-not-allowed"
          >
            Generate Link
          </button>
          {isOwner && (
            <button
              onClick={() => handleDelete(row.original.id)}
              className="text-red-600 hover:underline text-xs"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Test Configurations</h2>
        {isOwner && (
          <button
            onClick={() => router.push('/test-configs/new')}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            New Test Config
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <DataTable columns={columns} data={configs} />
      )}
    </div>
  );
}
