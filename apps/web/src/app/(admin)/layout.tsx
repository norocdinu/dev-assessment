import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { AdminUser } from '@dev-assessment/shared';

async function getMe(token: string): Promise<AdminUser | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/auth/me`, {
      headers: { Cookie: `token=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getMe(token);
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
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
        </nav>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="font-medium text-gray-700">{user.email}</div>
          <div className="capitalize">{user.role}</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
