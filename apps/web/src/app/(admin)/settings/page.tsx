'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  // Name section state
  const [name, setName] = useState('');
  const [nameEmail, setNameEmail] = useState('');
  const [nameCurrentPw, setNameCurrentPw] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // Password section state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => {
        setName(r.data.user.name ?? '');
        setNameEmail(r.data.user.email);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');
    setNameSaving(true);
    try {
      await api.put('/auth/me', { current_password: nameCurrentPw, name });
      toast.success('Name updated.');
      setNameCurrentPw('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosErr?.response?.status === 401) {
        setNameError('Current password is incorrect.');
      } else {
        setNameError('Failed to update name.');
      }
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pwNew !== pwConfirm) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/auth/me', { current_password: pwCurrent, new_password: pwNew });
      toast.success('Password updated.');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosErr?.response?.status === 401) {
        setPwError('Current password is incorrect.');
      } else {
        setPwError('Failed to update password. Please try again.');
      }
    } finally {
      setPwSaving(false);
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
      <h2 className="text-lg font-semibold text-foreground mb-6">Account Settings</h2>

      {/* Section 1: Display Name */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Display Name</h3>
        <form onSubmit={handleSaveName} className="space-y-5 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
            <input
              type="email"
              value={nameEmail}
              readOnly
              className="w-full px-3 py-2 border border-border rounded-md text-sm bg-muted/10 cursor-not-allowed text-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Current Password (to confirm)</label>
            <input
              type="password"
              value={nameCurrentPw}
              onChange={(e) => setNameCurrentPw(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={nameSaving}
              className="px-6 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50"
            >
              {nameSaving ? 'Saving…' : 'Save Name'}
            </button>
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
          </div>
        </form>
      </div>

      <hr className="border-t border-border my-8" />

      {/* Section 2: Change Password */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Current Password</label>
            <input
              type="password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">New Password</label>
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={pwSaving}
              className="px-6 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50"
            >
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
            {pwError && <p className="text-xs text-red-600 mt-1">{pwError}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
