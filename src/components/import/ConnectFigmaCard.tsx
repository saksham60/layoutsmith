"use client";
import { useEffect, useRef } from "react";

export default function ConnectFigmaButton({
  onConnected,
}: {
  onConnected?: (t: any) => void;
}) {
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
  const onMsg = (e: MessageEvent) => {
    // must match what the callback posts
    if (!e?.data || e.data.type !== 'figma:connected') return;

    // ensure it's our own origin (works on localhost and prod)
    if (e.origin !== window.location.origin) return;

    try { popupRef.current?.close(); } catch {}

    // we don't send tokens to the client anymore; cookie is set server-side
    // keep your existing signature: pass a truthy value
    onConnected?.(true);
  };

  window.addEventListener('message', onMsg);
  return () => window.removeEventListener('message', onMsg);
}, [onConnected]);
  const onClick = () => {
    const client_id = process.env.NEXT_PUBLIC_FIGMA_CLIENT_ID!;
    const redirect_uri = encodeURIComponent(
      process.env.NEXT_PUBLIC_FIGMA_REDIRECT_URI!
    );
    const scope = encodeURIComponent(
      "current_user:read projects:read file_content:read file_metadata:read file_versions:read file_comments:read library_content:read "
    );
    const state = crypto.randomUUID();

    const authUrl =
      `https://www.figma.com/oauth?client_id=${client_id}` +
      `&redirect_uri=${redirect_uri}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${state}`;

    const w = 520,
      h = 720;
    const y = Math.max(0, (window.outerHeight - h) / 2 + (window.screenY || 0));
    const x = Math.max(0, (window.outerWidth - w) / 2 + (window.screenX || 0));
    popupRef.current = window.open(
      authUrl,
      "figma-oauth",
      `popup=yes,width=${w},height=${h},top=${y},left=${x}`
    );
  };

  return (
    <button
      onClick={onClick}
      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg flex items-center gap-2 mx-auto transition shadow-lg shadow-purple-500/50"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h6v6H6zm0 6h6v6H6zm6-6h6v6h-6zm0 6h6v6h-6z" />
      </svg>
      Connect with Figma
    </button>
  );
}
