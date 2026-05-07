'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface AdminAccount {
  id: string;
  name: string | null;
  email: string;
  role: 'owner' | 'reviewer' | 'member';
  created_at: string;
}

export default function EditAccountPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [values, setValues] = useState({ name: '', role: '' });
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      try {
        const res = await api.get('/admin/accounts');
        const accounts: AdminAccount[] = res.data;
        const account = accounts.find((a) => a.id === id);
        if (!account) {
          setSubmitError('Account not found.');
          setLoading(false);
          return;
        }
        setValues({ name: account.name ?? '', role: account.role });
        setEmail(account.email);
      } catch {
        setSubmitError('Failed to load account.');
      } finally {
        setLoading(false);
      }
    }
    loadAccount();
  }, [id]);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      setErrors((er) => ({ ...er, [field]: '' }));
    };
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!values.name.trim()) errs.name = 'Required';
    if (!values.role) errs.role = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError('');
    try {
      await api.put(`/admin/accounts/${id}`, {
        name: values.name.trim(),
        role: values.role,
      });
      router.push('/accounts');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSubmitError(axiosErr?.response?.data?.error ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted/70">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Edit Account</h2>
      {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
          <input
            type="text"
            value={values.name}
            onChange={set('name')}
            placeholder="e.g. Jane Smith"
            className="w-full px-3 py-2 border border-border rounded-md text-sm"
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-muted/10 cursor-not-allowed text-muted"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Role</label>
          <select
            value={values.role}
            onChange={set('role')}
            className="w-full px-3 py-2 border border-border rounded-md text-sm"
          >
            <option value="owner">Owner</option>
            <option value="reviewer">Reviewer</option>
            <option value="member">Member</option>
          </select>
          {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
