'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { TestConfig } from '@dev-assessment/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { GenerateLinkDialog } from '@/components/admin/GenerateLinkDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Settings2, Link2, ListChecks, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TestConfigRow extends TestConfig {
  technology_name: string;
}

const DIFFICULTY_BADGE: Record<string, string> = {
  junior: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  mid: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  senior: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
};

// Sort order for cards within a technology group (junior → mid → senior).
const SENIORITY_RANK: Record<string, number> = { junior: 0, mid: 1, senior: 2 };

export default function TestConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<TestConfigRow[]>([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [generateFor, setGenerateFor] = useState<TestConfigRow | null>(null);

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

  // Group configs by technology, alphabetically.
  const grouped = useMemo(() => {
    const map = new Map<string, TestConfigRow[]>();
    for (const c of configs) {
      const list = map.get(c.technology_name) ?? [];
      list.push(c);
      map.set(c.technology_name, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (SENIORITY_RANK[a.difficulty] ?? 99) - (SENIORITY_RANK[b.difficulty] ?? 99) ||
          a.name.localeCompare(b.name)
      );
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [configs]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Test Configurations</h2>
        {isOwner && (
          <button
            onClick={() => router.push('/test-configs/new')}
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white hover:bg-[var(--brand)]/90"
          >
            New Test Config
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-4 w-40" />
              <Skeleton className="mt-6 h-9 w-full" />
            </div>
          ))}
        </div>
      ) : configs.length === 0 ? (
        <EmptyState
          icon={<Settings2 className="h-10 w-10" />}
          title="No test configurations"
          description="Create your first test config to start sending assessment links."
          action={
            isOwner ? (
              <button
                onClick={() => router.push('/test-configs/new')}
                className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white hover:bg-[var(--brand)]/90"
              >
                New Test Config
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([technology, items]) => (
            <section key={technology}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{technology}</h3>
                <span className="rounded-full bg-muted/10 px-2 py-0.5 text-xs text-muted">{items.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <article
                    key={c.id}
                    className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold leading-snug text-foreground">{c.name}</h4>
                      <DropdownMenu
                        ariaLabel={`Actions for ${c.name}`}
                        items={[
                          {
                            label: 'View links & results',
                            icon: <ListChecks className="h-4 w-4" />,
                            onClick: () => router.push(`/test-configs/${c.id}/links`),
                          },
                          ...(isOwner
                            ? [
                                {
                                  label: 'Delete',
                                  icon: <Trash2 className="h-4 w-4" />,
                                  destructive: true,
                                  onClick: () => setConfirmDeleteId(c.id),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-medium capitalize ${
                          DIFFICULTY_BADGE[c.difficulty] ?? 'border-border bg-muted/10 text-muted'
                        }`}
                      >
                        {c.difficulty}
                      </span>
                      <span className="text-muted">{c.num_questions} questions</span>
                      <span className="text-muted/50">·</span>
                      <span className="text-muted">Pass {c.pass_threshold_pct}%</span>
                    </div>

                    <p className="mt-3 text-xs text-muted">
                      Created {new Date(c.created_at).toLocaleDateString()}
                    </p>

                    <div className="mt-4 border-t border-border pt-4">
                      <button
                        onClick={() => setGenerateFor(c)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand)]/90"
                      >
                        <Link2 className="h-4 w-4" /> Generate link
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <GenerateLinkDialog
        open={generateFor !== null}
        testConfigId={generateFor?.id ?? ''}
        testConfigName={generateFor?.name ?? ''}
        onClose={() => setGenerateFor(null)}
      />

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
