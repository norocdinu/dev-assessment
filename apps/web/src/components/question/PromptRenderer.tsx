'use client';

import type { Block } from '@dev-assessment/shared';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Renders a question stimulus (text / code / image blocks) top-to-bottom. */
export function PromptRenderer({ prompt }: { prompt: Block[] }) {
  return (
    <div className="space-y-3">
      {prompt.map((b, i) => {
        if (b.type === 'text') {
          return <p key={i} className="text-sm text-foreground whitespace-pre-wrap">{b.text}</p>;
        }
        if (b.type === 'code') {
          return (
            <pre key={i} className="text-xs bg-muted/20 border border-border rounded-md p-3 overflow-x-auto">
              <code data-lang={b.lang}>{b.code}</code>
            </pre>
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={`${apiBase}/assets/${b.assetId}`} alt={b.alt}
               className="max-w-full rounded-md border border-border" />
        );
      })}
    </div>
  );
}
