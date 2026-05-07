'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { api } from '@/lib/api';
import type { TestConfig } from '@dev-assessment/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface TestConfigRow extends TestConfig {
  technology_name: string;
}

export default function TestConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<TestConfigRow[]>([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  function requestDelete(id: string) {
    setConfirmDeleteId(id);
  }

  async function executeDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      await api.delete(`/test-configs/${id}`);
      toast.success('Test configuration deleted');
      fetchConfigs();
    } catch {
      toast.error('Failed to delete test configuration');
    }
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
            onClick={() => router.push(`/test-configs/${row.original.id}/links`)}
            className="text-[var(--brand)] hover:underline text-xs"
          >
            Generate Link
          </button>
          {isOwner && (
            <button
              onClick={() => requestDelete(row.original.id)}
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
        <h2 className="text-lg font-semibold text-foreground">Test Configurations</h2>
        {isOwner && (
          <button
            onClick={() => router.push('/test-configs/new')}
            className="px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-md hover:bg-[var(--brand)]/90"
          >
            New Test Config
          </button>
        )}
      </div>
      <DataTable columns={columns} data={configs} loading={loading} />

      {!loading && configs.length === 0 && (
        <EmptyState
          icon={<Settings2 className="h-10 w-10" />}
          title="No test configurations"
          description="Create your first test config to start sending assessment links."
          action={
            isOwner ? (
              <button
                onClick={() => router.push('/test-configs/new')}
                className="px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-md hover:bg-[var(--brand)]/90"
              >
                New Test Config
              </button>
            ) : undefined
          }
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete test configuration?"
        description="This permanently removes the test configuration and cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDeleteId && executeDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
