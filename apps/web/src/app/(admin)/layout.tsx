'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { api } from '@/lib/api';
import type { AdminUser } from '@dev-assessment/shared';

const navItems = [
  { href: '/questions', label: 'Question Bank' },
  { href: '/test-configs', label: 'Test Configs' },
  { href: '/submissions', label: 'Submissions' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => router.push('/login'));
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">Dev Assessment</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2 text-sm rounded-md ${
                pathname.startsWith(href)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {label}
            </Link>
          ))}
          {user.role === 'owner' && (
            <Link
              href="/accounts"
              className={`flex items-center px-3 py-2 text-sm rounded-md ${
                pathname.startsWith('/accounts')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Accounts
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <Link
            href="/settings"
            className="block hover:bg-gray-50 rounded -mx-1 px-1 py-1 mb-1"
          >
            <div className="font-medium text-gray-700">{user.name || user.email}</div>
            {user.name && <div className="text-gray-500">{user.email}</div>}
            <div className="capitalize text-gray-400">{user.role}</div>
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('auth_token');
              window.location.href = '/login';
            }}
            className="mt-2 text-gray-400 hover:text-gray-600 underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
      <Toaster position="top-right" />
    </div>
  );
}
