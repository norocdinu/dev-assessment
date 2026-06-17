'use client';

import { useState } from 'react';
import type { Block } from '@dev-assessment/shared';
import { api } from '@/lib/api';

export function StimulusBuilder({ value, onChange }: { value: Block[]; onChange: (b: Block[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const update = (i: number, b: Block) => onChange(value.map((x, j) => (j === i ? b : x)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const add = (b: Block) => onChange([...value, b]);

  async function uploadImage(file: File) {
    setUploading(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/assets', fd);
      add({ type: 'image', assetId: r.data.assetId, alt: file.name });
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Upload failed');
    } finally { setUploading(false); }
  }

  return (
    <div className="space-y-3 border border-border rounded-md p-3">
      <div className="text-sm font-medium text-foreground/80">Question stimulus</div>
      {value.map((b, i) => (
        <div key={i} className="flex gap-2 items-start">
          {b.type === 'text' && (
            <textarea rows={2} value={b.text} onChange={(e) => update(i, { type: 'text', text: e.target.value })}
              placeholder="Text (use ___ for fill-in-the-blank gaps)"
              className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          )}
          {b.type === 'code' && (
            <div className="flex-1 space-y-1">
              <input value={b.lang} onChange={(e) => update(i, { ...b, lang: e.target.value })}
                placeholder="language (e.g. sql, dax)" className="w-40 px-2 py-1 border border-border rounded text-xs" />
              <textarea rows={4} value={b.code} onChange={(e) => update(i, { ...b, code: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md text-xs font-mono" />
            </div>
          )}
          {b.type === 'image' && (
            <div className="flex-1 text-xs text-muted">Image: {b.alt} ({b.assetId.slice(0, 8)}…)</div>
          )}
          <button type="button" onClick={() => remove(i)} className="text-xs text-red-600 hover:underline">remove</button>
        </div>
      ))}
      <div className="flex gap-2 text-xs">
        <button type="button" onClick={() => add({ type: 'text', text: '' })} className="px-2 py-1 border border-border rounded">+ Text</button>
        <button type="button" onClick={() => add({ type: 'code', lang: '', code: '' })} className="px-2 py-1 border border-border rounded">+ Code</button>
        <label className="px-2 py-1 border border-border rounded cursor-pointer">
          {uploading ? 'Uploading…' : '+ Image'}
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
        </label>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
