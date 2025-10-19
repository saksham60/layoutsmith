'use client';

import React, { useMemo, useState } from 'react';

type Props = {
  /** Optional starting embed src (if you want a default) */
  defaultSrc?: string;
};

export default function FigmaEmbedPaste({ defaultSrc }: Props) {
  const [raw, setRaw] = useState('');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(450);

  // Extract the src from a pasted <iframe ...>...</iframe>
  const extractedSrc = useMemo(() => {
    // If user pasted ONLY a URL, use that
    const trimmed = raw.trim();
    if (trimmed.startsWith('https://embed.figma.com/')) return trimmed;

    // Try to pull src="..." from the HTML
    const match = trimmed.match(/src\s*=\s*["']([^"']+)["']/i);
    const src = match?.[1] || '';

    // Allow only embed.figma.com for safety
    try {
      const u = new URL(src);
      if (u.hostname === 'embed.figma.com') return u.toString();
    } catch {
      /* no-op */
    }
    return '';
  }, [raw]);

  const finalSrc = extractedSrc || defaultSrc || '';

  return (
    <div className="max-w-5xl mx-auto my-6 space-y-4">
      <div className="text-left">
        <div className="text-sm font-semibold text-gray-300">Paste your Figma embed iframe</div>
        <div className="text-xs text-gray-400">
          You can paste the whole <code>&lt;iframe ...&gt;</code> snippet, or just the URL from it.
        </div>
      </div>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={`Paste here, e.g.\n\n<iframe style="border:1px solid rgba(0,0,0,.1);" width="800" height="450" src="https://embed.figma.com/design/GNUmBwk2x8Eq28KyvA4Y0v/Mobile-Dev-Test?node-id=0-1&embed-host=share" allowfullscreen></iframe>\n\nor just the src URL:`}
        className="w-full min-h-[120px] rounded-lg bg-slate-900 border border-white/10 p-3 text-sm outline-none focus:border-purple-500"
      />

      <div className="flex items-center gap-3 text-sm">
        <label className="text-gray-400">
          Width:{' '}
          <input
            type="number"
            className="w-24 px-2 py-1 rounded bg-slate-900 border border-white/10 outline-none"
            value={width}
            onChange={(e) => setWidth(Math.max(100, Number(e.target.value) || 800))}
          />
        </label>
        <label className="text-gray-400">
          Height:{' '}
          <input
            type="number"
            className="w-24 px-2 py-1 rounded bg-slate-900 border border-white/10 outline-none"
            value={height}
            onChange={(e) => setHeight(Math.max(100, Number(e.target.value) || 450))}
          />
        </label>
      </div>

      <div className="text-xs text-gray-400">
        {finalSrc
          ? 'Preview below — we only allow https://embed.figma.com/* for safety.'
          : 'Paste a valid Figma embed iframe or a URL starting with https://embed.figma.com/…'}
      </div>

      <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900">
        {finalSrc ? (
          <iframe
            src={finalSrc}
            width={width}
            height={height}
            allowFullScreen
            style={{ border: '1px solid rgba(0,0,0,0.1)', display: 'block', margin: '0 auto' }}
            title="Figma Embed"
          />
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">No valid embed URL detected yet.</div>
        )}
      </div>
    </div>
  );
}
