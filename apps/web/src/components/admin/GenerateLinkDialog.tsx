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

interface ArtStyle {
  backgroundColor: string;
  backgroundImage: string;
}

/**
 * Builds a randomly generated gradient-mesh "image" — a few soft colour blobs
 * over a base hue. Self-contained (no network), regenerated each time the
 * dialog opens so every invite gets its own artwork.
 */
function randomMesh(): ArtStyle {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const baseHue = Math.floor(rand(0, 360));
  const blobs = Array.from({ length: 5 }, () => {
    const hue = (baseHue + Math.floor(rand(-60, 90)) + 360) % 360;
    const x = Math.floor(rand(0, 100));
    const y = Math.floor(rand(0, 100));
    const stop = Math.floor(rand(35, 65));
    return `radial-gradient(circle at ${x}% ${y}%, hsl(${hue} 78% 62% / 0.9), transparent ${stop}%)`;
  });
  return {
    backgroundColor: `hsl(${baseHue} 62% 46%)`,
    backgroundImage: blobs.join(','),
  };
}

/**
 * Two-step dialog: capture the (required) candidate name, generate the link,
 * then offer share targets (copy / email / Teams / native share).
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
  const [art, setArt] = useState<ArtStyle>({ backgroundColor: '', backgroundImage: '' });
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset to a clean form (and fresh artwork) each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setCandidateName('');
    setUrl('');
    setError('');
    setCopied(false);
    setGenerating(false);
    setArt(randomMesh());
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

  const trimmedName = candidateName.trim();
  const nameValid = trimmedName.length > 0;

  async function handleGenerate() {
    if (!nameValid) {
      setError('Please enter the candidate name.');
      inputRef.current?.focus();
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/admin/test-links', {
        test_config_id: testConfigId,
        candidate_name: trimmedName,
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
      `Hi ${trimmedName},\n\nPlease complete your technical assessment using the link below:\n\n${url}\n\nThe test is timed and begins as soon as you open it.\n\nGood luck!`
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
        text: `Hi ${trimmedName}, here is your technical assessment link:`,
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
        className="flex w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Generate assessment link"
      >
        {/* Left — randomly generated artwork */}
        <aside
          className="relative hidden w-2/5 shrink-0 sm:block"
          style={art}
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              Assessment invite
            </p>
            <p className="mt-1 text-lg font-semibold leading-snug drop-shadow-sm">{testConfigName}</p>
          </div>
        </aside>

        {/* Right — content */}
        <div className="relative flex flex-1 flex-col">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-muted/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {!url ? (
            // Step 1 — candidate name (required)
            <>
              <div className="p-8">
                <h2 className="text-lg font-semibold text-foreground">Generate assessment link</h2>
                <p className="mt-1 text-sm text-muted">{testConfigName}</p>

                <div className="mt-7">
                  <label htmlFor="candidate-name" className="mb-1.5 block text-sm font-medium text-foreground/80">
                    Candidate name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="candidate-name"
                    ref={inputRef}
                    value={candidateName}
                    onChange={(e) => {
                      setCandidateName(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerate();
                    }}
                    placeholder="e.g. Jane Smith"
                    className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  />
                  <p className="mt-2 text-xs text-muted">
                    Identifies this candidate&apos;s submission. They don&apos;t need to log in.
                  </p>
                  {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                </div>
              </div>
              <div className="mt-auto flex justify-end gap-3 border-t border-border p-6">
                <button
                  onClick={onClose}
                  className="rounded-md border border-border px-4 py-2 text-sm text-foreground/70 transition-colors hover:bg-muted/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !nameValid}
                  className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--brand)]/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? 'Generating…' : 'Generate link'}
                </button>
              </div>
            </>
          ) : (
            // Step 2 — link + share
            <>
              <div className="p-8">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-green-600">
                  <Check className="h-4 w-4" /> Link ready for {trimmedName}
                </div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground/80"
                  />
                  <button
                    onClick={copyLink}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/10"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-muted">Share via</p>
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
              <div className="mt-auto flex justify-between gap-3 border-t border-border p-6">
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
      {label}
    </button>
  );
}
