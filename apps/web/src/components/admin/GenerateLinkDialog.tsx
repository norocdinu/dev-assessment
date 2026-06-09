'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Copy, Check, Share2, X, MessageSquare } from 'lucide-react';

interface GenerateLinkDialogProps {
  open: boolean;
  testConfigId: string;
  testConfigName: string;
  onClose: () => void;
  onGenerated?: () => void;
}

/**
 * Two-step dialog: capture the candidate name, generate the link, then offer
 * share targets (copy / email / Teams / native share).
 */
export function GenerateLinkDialog({
  open,
  testConfigId,
  testConfigName,
  onClose,
  onGenerated,
}: GenerateLinkDialogProps) {
  const [candidateName, setCandidateName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset to a clean form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setCandidateName('');
    setUrl('');
    setError('');
    setCopied(false);
    setGenerating(false);
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const greeting = candidateName.trim() ? ` ${candidateName.trim()}` : '';

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/admin/test-links', {
        test_config_id: testConfigId,
        candidate_name: candidateName.trim() || undefined,
      });
      setUrl(res.data.url);
      onGenerated?.();
    } catch {
      setError('Failed to generate link. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy — select the link and copy manually.');
    }
  }

  function shareEmail() {
    const subject = encodeURIComponent('Your technical assessment');
    const body = encodeURIComponent(
      `Hi${greeting},\n\nPlease complete your technical assessment using the link below:\n\n${url}\n\nThe test is timed and begins as soon as you open it.\n\nGood luck!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function shareTeams() {
    window.open(
      `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&preview=true`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function shareNative() {
    try {
      await navigator.share({
        title: 'Technical assessment',
        text: `Hi${greeting}, here is your technical assessment link:`,
        url,
      });
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Generate assessment link"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Generate assessment link</h2>
            <p className="mt-0.5 text-sm text-muted">{testConfigName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-muted/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!url ? (
          // Step 1 — candidate name
          <>
            <div className="px-6 py-5">
              <label htmlFor="candidate-name" className="mb-1.5 block text-sm font-medium text-foreground/80">
                Candidate name <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="candidate-name"
                ref={inputRef}
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                placeholder="e.g. Jane Smith"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
              <p className="mt-2 text-xs text-muted">
                Helps you identify the submission later. The candidate doesn&apos;t need to log in.
              </p>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm text-foreground/70 transition-colors hover:bg-muted/10"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--brand)]/90 disabled:opacity-50"
              >
                {generating ? 'Generating…' : 'Generate link'}
              </button>
            </div>
          </>
        ) : (
          // Step 2 — link + share
          <>
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-green-600">
                <Check className="h-4 w-4" /> Link ready{candidateName.trim() ? ` for ${candidateName.trim()}` : ''}
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground/80"
                />
                <button
                  onClick={copyLink}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/10"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-muted">Share via</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <ShareButton onClick={shareEmail} icon={<Mail className="h-4 w-4" />} label="Email" />
                <ShareButton
                  onClick={shareTeams}
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Teams"
                  accent="#6264A7"
                />
                {canNativeShare && (
                  <ShareButton onClick={shareNative} icon={<Share2 className="h-4 w-4" />} label="More…" />
                )}
              </div>
            </div>
            <div className="flex justify-between gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => {
                  setUrl('');
                  setCandidateName('');
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="rounded-md border border-border px-4 py-2 text-sm text-foreground/70 transition-colors hover:bg-muted/10"
              >
                Generate another
              </button>
              <button
                onClick={onClose}
                className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--brand)]/90"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ShareButton({
  onClick,
  icon,
  label,
  accent,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/10"
      style={accent ? ({ color: accent } as React.CSSProperties) : undefined}
    >
      {icon}
      <span className={accent ? 'text-foreground/80' : undefined}>{label}</span>
    </button>
  );
}
