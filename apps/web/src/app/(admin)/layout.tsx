'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api';
import type { AdminUser } from '@dev-assessment/shared';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/questions', label: 'Question Bank' },
  { href: '/test-configs', label: 'Test Configs' },
  { href: '/submissions', label: 'Submissions' },
];

function SidebarContent({
  user,
  pathname,
  onNavClick,
}: {
  user: AdminUser;
  pathname: string;
  onNavClick?: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <>
      <div className="p-4 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Dev Assessment</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavClick}
            className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
              pathname.startsWith(href)
                ? 'bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)] font-medium'
                : 'text-foreground/80 hover:bg-muted/20'
            }`}
          >
            {label}
          </Link>
        ))}
        {user.role === 'owner' && (
          <Link
            href="/accounts"
            onClick={onNavClick}
            className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
              pathname.startsWith('/accounts')
                ? 'bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)] font-medium'
                : 'text-foreground/80 hover:bg-muted/20'
            }`}
          >
            Accounts
          </Link>
        )}
      </nav>
      <div className="p-4 border-t border-border text-xs">
        <Link
          href="/settings"
          onClick={onNavClick}
          className="block hover:bg-muted/10 rounded -mx-1 px-1 py-1 mb-1"
        >
          <div className="font-medium text-foreground/80">{user.name || user.email}</div>
          {user.name && <div className="text-muted">{user.email}</div>}
          <div className="capitalize text-muted/70">{user.role}</div>
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="p-1.5 rounded-md text-muted hover:bg-muted/20 hover:text-foreground transition-colors"
          >
            {resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('auth_token');
              window.location.href = '/login';
            }}
            className="text-muted hover:text-foreground transition-colors underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => router.push('/login'));
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-border border-t-[var(--brand)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 h-12 bg-card border-b border-border flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className="text-foreground hover:bg-muted/20 p-1.5 rounded-md transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-foreground">Dev Assessment</span>
      </div>

      {/* Mobile overlay + sheet */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-56 bg-card border-r border-border flex flex-col z-50 md:hidden">
            <SidebarContent
              user={user}
              pathname={pathname}
              onNavClick={() => setMobileMenuOpen(false)}
            />
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
      <Toaster position="top-right" toastOptions={{ className: 'z-[100]' }} />
    </div>
  );
}
