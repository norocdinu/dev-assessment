'use client';

import { useState, useEffect } from 'react';

export type ExportScope = 'selected' | 'page' | 'all';

export function ExportScopeDialog({ open, selectedCount, pageCount, onConfirm, onClose }: {
  open: boolean;
  selectedCount: number;
  pageCount: number;
  onConfirm: (scope: ExportScope) => void;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<ExportScope>('all');

  // Default to "selected" when rows are checked, else "all".
  useEffect(() => {
    if (open) setScope(selectedCount > 0 ? 'selected' : 'all');
  }, [open, selectedCount]);

  if (!open) return null;

  const Option = ({ value, label, disabled }: { value: ExportScope; label: string; disabled?: boolean }) => (
    <label className={`flex items-center gap-2 text-sm py-1 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input type="radio" name="export-scope" value={value} checked={scope === value}
        disabled={disabled} onChange={() => setScope(value)} />
      {label}
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-foreground mb-3">Export CSV</h3>
        <div className="mb-4">
          <Option value="selected" label={`Selected (${selectedCount})`} disabled={selectedCount === 0} />
          <Option value="page" label={`Current page (${pageCount})`} />
          <Option value="all" label="All matching filters" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-border text-foreground/80 hover:bg-muted/10">Cancel</button>
          <button onClick={() => onConfirm(scope)} className="px-4 py-2 bg-[var(--brand)] text-white text-sm rounded-md hover:bg-[var(--brand)]/90">Export</button>
        </div>
      </div>
    </div>
  );
}
