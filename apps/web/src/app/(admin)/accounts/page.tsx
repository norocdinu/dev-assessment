'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { api } from '@/lib/api';

interface AdminAccount {
  id: string;
  name: string | null;
  email: string;
  role: 'owner' | 'reviewer' | 'member';
  created_at: string;
}

const roleBadgeClass: Record<string, string> = {
  owner: 'bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)]',
  reviewer: 'bg-muted/20 text-foreground/70',
  member: 'bg-green-100 text-green-700',
};

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/accounts');
      setAccounts(res.data);
    } catch {
      setError('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this account? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/accounts/${id}`);
      fetchAccounts();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosErr?.response?.status === 409) {
        const msg = axiosErr.response?.data?.error ?? 'Cannot delete account.';
        setError(msg);
      } else {
        setError('Failed to delete account.');
      }
    }
  }

  const columns: ColumnDef<AdminAccount>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    },
    {
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: ({ getValue }) => {
        const role = getValue<string>();
        return (
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${roleBadgeClass[role] ?? 'bg-muted/20 text-foreground/70'}`}>
            {role}
          </span>
        );
      },
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }: { row: { original: AdminAccount } }) => (
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/accounts/${row.original.id}/edit`)}
            className="text-[var(--brand)] hover:underline text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="text-red-600 hover:underline text-xs"
          >
            Delete
          </button>
        </div>
      ),
    } as ColumnDef<AdminAccount>,
  ];

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted/70">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
        <button
          onClick={() => router.push('/accounts/new')}
          className="px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50"
        >
          Create Account
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <DataTable columns={columns} data={accounts} />
    </div>
  );
}
