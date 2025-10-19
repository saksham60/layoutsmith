'use client';
import React from 'react';

type FigmaEmbedProps = {
  /** The Figma file key, e.g. "GNUmBwk2x8Eq28KyvA4Y0v" */
  fileKey: string;
  /** Optional node to focus (e.g. "0:1"). If omitted, embeds the file default. */
  nodeId?: string;
  /**
   * 'design' (default) or 'proto' — use 'proto' to embed a prototype (play mode).
   * For prototypes, you can also pass prototype params (see below).
   */
  mode?: 'design' | 'proto';
  /** The host name of your app; Figma recommends setting embed-host */
  embedHost?: string;

  /** Optional: tweak the iframe container */
  className?: string;
  /** Optional: title attribute for accessibility */
  title?: string;

  /** Extra query params for prototypes (e.g. { 'scaling': 'scale-down', 'starting-point-node-id': '1:2' }) */
  protoParams?: Record<string, string | number | boolean>;
};

export default function FigmaEmbed({
  fileKey,
  nodeId,
  mode = 'design',
  embedHost = 'yourapp',
  className = '',
  title = 'Figma Embed',
  protoParams,
}: FigmaEmbedProps) {
  const base = mode === 'proto' ? 'https://embed.figma.com/proto' : 'https://embed.figma.com/design';

  // Build query string
  const qs = new URLSearchParams();
  qs.set('embed-host', embedHost);
  if (nodeId) qs.set('node-id', nodeId);
  if (mode === 'proto' && protoParams) {
    for (const [k, v] of Object.entries(protoParams)) qs.set(k, String(v));
  }

  const src = `${base}/${encodeURIComponent(fileKey)}?${qs.toString()}`;

  // Responsive 16:9 by default; override via className if needed.
  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-white/10 ${className}`}>
      <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 */ }} />
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        style={{ border: '1px solid rgba(0,0,0,0.1)' }}
        referrerPolicy="origin"
      />
    </div>
  );
}
