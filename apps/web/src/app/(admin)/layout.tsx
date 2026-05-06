'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AdminUser } from '@dev-assessment/shared';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
          <Link
            href="/questions"
            className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
          >
            Question Bank
          </Link>
          <Link
            href="/test-configs"
            className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
          >
            Test Configs
          </Link>
          <Link
            href="/submissions"
            className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
          >
            Submissions
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="font-medium text-gray-700">{user.email}</div>
          <div className="capitalize">{user.role}</div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
