'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewAccountPage() {
  const router = useRouter();
  const [values, setValues] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      setErrors((er) => ({ ...er, [field]: '' }));
    };
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!values.name.trim()) errs.name = 'Required';
    if (!values.email.trim()) errs.email = 'Required';
    if (!values.role) errs.role = 'Required';
    if (!values.password) errs.password = 'Required';
    else if (values.password.length < 8) errs.password = 'Must be at least 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitError('');
    try {
      await api.post('/admin/accounts', {
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        password: values.password,
      });
      router.push('/accounts');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSubmitError(axiosErr?.response?.data?.error ?? 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Create Account</h2>
      {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={values.name}
            onChange={set('name')}
            placeholder="e.g. Jane Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={values.email}
            onChange={set('email')}
            placeholder="jane@company.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={values.role}
            onChange={set('role')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select role…</option>
            <option value="owner">Owner</option>
            <option value="reviewer">Reviewer</option>
            <option value="member">Member</option>
          </select>
          {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={values.password}
            onChange={set('password')}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
