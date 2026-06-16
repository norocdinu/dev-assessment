'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Technology } from '@dev-assessment/shared';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface Usage {
  questionCount: number; activeQuestionCount: number;
  configCount: number; liveLinkCount: number;
  blockingConfigs: Array<{ id: string; name: string }>;
}

export function ManageTechnologiesDialog({ open, onClose, onChanged }: {
  open: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [techs, setTechs] = useState<Technology[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  // delete dialog state
  const [target, setTarget] = useState<Technology | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [confirmEmptyId, setConfirmEmptyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get(`/technologies?include_archived=${showArchived ? 'true' : 'false'}`);
    setTechs(res.data);
  }, [showArchived]);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  async function handleAdd() {
    if (!name.trim() || !slug.trim()) return;
    setBusy(true);
    try {
      await api.post('/technologies', { name: name.trim(), slug: slug.trim() });
      toast.success('Technology added');
      setName(''); setSlug(''); setSlugEdited(false);
      await load(); onChanged();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      toast.error(e?.response?.status === 409 ? 'That slug already exists' : 'Failed to add technology');
    } finally { setBusy(false); }
  }

  async function startDelete(t: Technology) {
    const res = await api.get(`/technologies/${t.id}/usage`);
    const u: Usage = res.data;
    if (u.liveLinkCount > 0) {
      toast.error(`Blocked: ${u.blockingConfigs.map((c) => c.name).join(', ')} ${u.blockingConfigs.length === 1 ? 'has' : 'have'} live candidate link(s).`);
      return;
    }
    if (u.questionCount === 0 && u.configCount === 0) { setConfirmEmptyId(t.id); return; }
    setTarget(t); setUsage(u);
  }

  async function runDelete(t: Technology, mode: 'archive' | 'delete') {
    setBusy(true);
    try {
      const res = await api.delete(`/technologies/${t.id}?mode=${mode}`);
      const { archivedQuestions, deletedQuestions } = res.data;
      toast.success(mode === 'delete'
        ? `Deleted ${deletedQuestions} question(s)${archivedQuestions ? `, archived ${archivedQuestions} used in submissions` : ''}`
        : `Archived technology and ${archivedQuestions} question(s)`);
      setTarget(null); setUsage(null);
      await load(); onChanged();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { blockingConfigs?: Array<{ name: string }> } } };
      if (e?.response?.status === 409) {
        toast.error(`Blocked by live links: ${(e.response.data?.blockingConfigs ?? []).map((c) => c.name).join(', ')}`);
      } else { toast.error('Delete failed'); }
    } finally { setBusy(false); }
  }

  async function runEmptyDelete(id: string) {
    setConfirmEmptyId(null);
    setBusy(true);
    try {
      await api.delete(`/technologies/${id}?mode=delete`);
      toast.success('Technology deleted');
      await load(); onChanged();
    } catch { toast.error('Delete failed'); } finally { setBusy(false); }
  }

  async function runRestore(id: string) {
    setBusy(true);
    try {
      await api.post(`/technologies/${id}/restore`);
      toast.success('Technology restored');
      await load(); onChanged();
    } catch { toast.error('Restore failed'); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Manage Technologies</h3>
          <label className="flex items-center gap-2 text-xs text-foreground/70">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>

        {/* Add form */}
        <div className="flex gap-2 mb-4">
          <input
            placeholder="Name (e.g. Snowflake)"
            value={name}
            onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }}
            className="px-3 py-2 border border-border rounded-md text-sm flex-1"
          />
          <input
            placeholder="slug"
            value={slug}
            onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }}
            className="px-3 py-2 border border-border rounded-md text-sm w-32"
          />
          <button onClick={handleAdd} disabled={busy || !name.trim() || !slug.trim()}
            className="px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50">
            Add
          </button>
        </div>

        {/* List */}
        <ul className="divide-y divide-border border border-border rounded-md">
          {techs.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <span className={`font-medium ${t.is_active === false ? 'text-muted/70' : 'text-foreground'}`}>{t.name}</span>
                <span className="text-xs text-muted/70 ml-2">{t.slug}</span>
                <span className="text-xs text-muted/70 ml-2">· {t.question_count ?? 0} q</span>
                {t.is_active === false && <span className="text-xs text-orange-600 ml-2">archived</span>}
              </div>
              {t.is_active === false
                ? <button onClick={() => runRestore(t.id)} disabled={busy} className="text-[var(--brand)] hover:underline text-xs">Restore</button>
                : <button onClick={() => startDelete(t)} disabled={busy} className="text-red-600 hover:underline text-xs">Delete</button>}
            </li>
          ))}
        </ul>

        <button onClick={onClose} className="mt-4 text-sm text-foreground/70 hover:underline">Close</button>
      </div>

      {/* Choice dialog for populated tech */}
      {target && usage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => { setTarget(null); setUsage(null); }}>
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-foreground mb-2">Delete &ldquo;{target.name}&rdquo;?</h4>
            <p className="text-sm text-foreground/70 mb-4">
              This technology has {usage.questionCount} question(s){usage.configCount > 0 ? ` and ${usage.configCount} test config(s)` : ''}. Choose what to do:
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => runDelete(target, 'archive')} disabled={busy}
                className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700">
                Archive — hide it and its questions (reversible)
              </button>
              <button onClick={() => runDelete(target, 'delete')} disabled={busy}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                Delete permanently — questions used in submissions are archived instead
              </button>
              <button onClick={() => { setTarget(null); setUsage(null); }} className="text-sm text-foreground/70 hover:underline mt-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty-tech confirm */}
      <ConfirmDialog
        open={confirmEmptyId !== null}
        title="Delete technology?"
        description="This technology has no questions or configs. This permanently removes it."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmEmptyId && runEmptyDelete(confirmEmptyId)}
        onCancel={() => setConfirmEmptyId(null)}
      />
    </div>
  );
}
