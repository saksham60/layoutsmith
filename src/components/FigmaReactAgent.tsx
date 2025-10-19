'use client';

/**
 * FigmaReactAgent.tsx
 * ------------------------------------------------------------
 * High-level import & generate screen:
 * - Connect to Figma
 * - Paste a Figma URL/iframe and import items
 * - Build rich LLM briefs, log to console
 * - Generate React code for the selected item via Bedrock API
 */

import React, { useEffect, useState } from 'react';
import { Play, Eye, ChevronRight, GitCompare, Download, Rocket } from 'lucide-react';

import TopNav from '@/components/nav/TopNav';
import ConnectFigmaCard from '@/components/import/ConnectFigmaCard';
import ComponentsList from '@/components/workspace/ComponentsList';
import CodeEditor from '@/components/workspace/CodeEditor';
import PreviewPane from '@/components/workspace/PreviewPane';

import type { ComponentItem } from '@/components/types';
import {
  getFigmaFileComponents,
  getFileDocument,
  collectInterestingNodes,
  getFileNodes,
} from '@/app/lib/figmaClient';

/* ------------------------------------------------------------
 * Small inline spinner for overlays
 * ------------------------------------------------------------ */
function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      <span className="text-sm text-white/80">Generating with Bedrock…</span>
    </div>
  );
}

/* ============================================================
 * Helper: Extract FILE_KEY from a Figma URL or <iframe> embed
 * ============================================================ */
function extractFileKey(input: string): string | null {
  const iframeSrc = /<iframe[^>]*\s+src="([^"]+)"/i.exec(input)?.[1];
  const urlStr = (iframeSrc || input || '').trim();
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return null;
  }
  // Support both app & embed URLs
  const fromApp = /\/file\/([A-Za-z0-9_-]+)\//.exec(url.pathname)?.[1];
  const fromEmbed = /\/design\/([A-Za-z0-9_-]+)\//.exec(url.pathname)?.[1];
  return fromApp || fromEmbed || null;
}

/* ============================================================
 * Helper: Build a compact, LLM-friendly "brief" for a node
 * ============================================================ */
function briefForNode(node: any) {
  const textNodes: Array<{ id: string; name: string; characters: string; style?: any }> = [];
  const stack = [node];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    if (cur.type === 'TEXT' && typeof cur.characters === 'string') {
      textNodes.push({
        id: cur.id,
        name: cur.name,
        characters: cur.characters,
        style: cur.style,
      });
    }
    if (Array.isArray(cur.children)) stack.push(...cur.children);
  }

  const summarizeFills = (fills?: any[]) => {
    if (!fills || !fills.length) return [];
    return fills.slice(0, 6).map((f) => {
      if (f.type === 'SOLID') {
        const c = f.color || {};
        return { type: 'SOLID', r: c.r, g: c.g, b: c.b, a: f.opacity ?? 1 };
      }
      if (f.type?.startsWith('GRADIENT')) {
        return { type: f.type, stops: (f.gradientStops || []).length };
      }
      return { type: f.type };
    });
  };

  const autolayout =
    node.layoutMode && node.layoutMode !== 'NONE'
      ? {
          layoutMode: node.layoutMode,
          primaryAxisSizingMode: node.primaryAxisSizingMode,
          counterAxisSizingMode: node.counterAxisSizingMode,
          primaryAxisAlignItems: node.primaryAxisAlignItems,
          counterAxisAlignItems: node.counterAxisAlignItems,
          itemSpacing: node.itemSpacing,
          padding: {
            left: node.paddingLeft,
            right: node.paddingRight,
            top: node.paddingTop,
            bottom: node.paddingBottom,
          },
          wrap: node.layoutWrap,
          counterAxisSpacing: node.counterAxisSpacing,
        }
      : null;

  const bbox = node.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 };

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    size: { width: bbox.width, height: bbox.height },
    position: { x: bbox.x, y: bbox.y },
    visible: node.visible !== false,
    fills: summarizeFills(node.fills),
    strokes: summarizeFills(node.strokes),
    cornerRadius: node.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii,
    opacity: node.opacity,
    blendMode: node.blendMode,
    autolayout,
    text: textNodes,
    children: Array.isArray(node.children)
      ? node.children.map((c: any) => ({ id: c.id, name: c.name, type: c.type }))
      : [],
  };
}

/* ============================================================
 * Component: FigmaReactAgent (main UX)
 * ============================================================ */
export default function FigmaReactAgent() {
  // Tabs
  const [activeTab, setActiveTab] = useState<'import' | 'workspace'>('import');

  // Figma token presence (set by ConnectFigmaCard)
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasToken(!!sessionStorage.getItem('figma_token'));
    }
  }, []);

  // Paste box content
  const [pasteValue, setPasteValue] = useState('');

  // Items for the editor (list + code)
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);

  // LLM briefs aligned by editor index (idx in components[])
  const [llmBriefs, setLlmBriefs] = useState<any[]>([]);

  // Loading flags
  const [importing, setImporting] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* ------------------------------------------------------------
   * Import flow
   * ------------------------------------------------------------ */
  const importFromPaste = async () => {
    const fileKey = extractFileKey(pasteValue);
    if (!fileKey) {
      alert('Could not find a FILE_KEY. Paste a Figma file/prototype URL or a full <iframe>.');
      return;
    }

    try {
      setImporting(true);

      // 1) Try explicit components
      const figmaComps = await getFigmaFileComponents(fileKey);
      let items: Array<{ id: string; name: string; type: string }> = [];

      if (figmaComps?.length) {
        items = figmaComps.slice(0, 300).map((c: any) => ({
          id: c.node_id,
          name: c.name,
          type: 'COMPONENT',
        }));
      }

      // 2) Fallback: document → top frames + component sets
      if (items.length === 0) {
        const doc = await getFileDocument(fileKey);
        const interesting = collectInterestingNodes(doc);
        if (!interesting.length) {
          alert('No frames/components found in this file.');
          return;
        }
        items = interesting.slice(0, 300);
      }

      // 3) Fetch full nodes and build briefs
      const idList = items.map((i) => i.id);
      const nodesById = await getFileNodes(fileKey, idList);
      const briefs = idList
        .map((id) => nodesById[id])
        .filter(Boolean)
        .map((fullNode) => briefForNode(fullNode));

      console.log('[LLM_BRIEFS]', briefs);
      setLlmBriefs(briefs);

      // 4) Fill editor with placeholders
      const mapped: ComponentItem[] = items.map((n, idx) => ({
        id: idx + 1,
        name: n.name,
        type: n.type === 'FRAME' ? 'Screen' : 'Component',
        variants: 1,
        code:
          '// React code will be generated by the LLM using the console [LLM_BRIEFS] details for this item.\n' +
          '// This is a placeholder so the editor renders.',
      }));

      setComponents(mapped);
      setSelectedComponent(mapped[0]);
      setActiveTab('workspace');
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import from this file. Check token/scopes and try a different link.');
    } finally {
      setImporting(false);
    }
  };

  /* ------------------------------------------------------------
   * Generate code for the selected item via Bedrock
   * ------------------------------------------------------------ */
  const generateSelectedWithBedrock = async () => {
    if (!selectedComponent) return;
    const idx = components.findIndex((c) => c.id === selectedComponent.id);
    if (idx < 0) return;

    const brief = llmBriefs[idx];
    if (!brief) {
      alert('No LLM brief found for this item. Try re-importing.');
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch('/api/llm/bedrock/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`Bedrock API error (${res.status}): ${errTxt}`);
      }

      // API returns { ok, results: [{ name, code }], raw? }
      const data: any = await res.json();
      const code: string | undefined = data?.results?.[0]?.code || data?.code || data?.raw;

      if (!code || !code.trim()) {
        alert('Bedrock returned an empty response.');
        return;
      }

      setComponents((prev) => prev.map((c) => (c.id === selectedComponent.id ? { ...c, code } : c)));
      setSelectedComponent((prev) => (prev ? { ...prev, code } : prev));
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Bedrock generation failed');
    } finally {
      setGenerating(false);
    }
  };

  /* ------------------------------------------------------------
   * Editor: Handle edits in the code panel
   * ------------------------------------------------------------ */
  const handleCodeChange = (newCode: string) => {
    if (!selectedComponent) return;
    setComponents((prev) => prev.map((c) => (c.id === selectedComponent.id ? { ...c, code: newCode } : c)));
    setSelectedComponent((prev) => (prev ? { ...prev, code: newCode } : prev));
  };

  /* ============================================================
   * Render
   * ============================================================ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      {/* Top navigation bar */}
      <TopNav />

      {/* -------- Import tab -------- */}
      {activeTab === 'import' && (
        <section className="max-w-7xl mx-auto px-6 py-20">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm mb-6">
              <Eye className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">Pixel-perfect React generation via Figma</span>
            </div>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Transform Figma to Production-Ready React
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Connect your Figma account, paste any file/prototype/embed URL, import screens/components, then generate
              React using Amazon Bedrock (Claude 3.5).
            </p>
          </div>

          {/* Connect + paste area */}
          <div className="max-w-3xl mx-auto">
            <ConnectFigmaCard onConnected={() => setHasToken(true)} />

            {hasToken && (
              <div className="mt-8">
                <label className="block text-sm text-gray-400 mb-2">
                  Paste a Figma file/prototype URL or a full <span className="font-mono">&lt;iframe&gt;</span> snippet
                </label>
                <textarea
                  className="w-full h-28 p-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none"
                  placeholder={`https://www.figma.com/file/<FILE_KEY>/...\nor\n<iframe ... src="https://embed.figma.com/design/<FILE_KEY>/..." ...></iframe>`}
                  value={pasteValue}
                  onChange={(e) => setPasteValue(e.target.value)}
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={importFromPaste}
                    disabled={importing}
                    className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-medium disabled:opacity-60"
                  >
                    {importing ? 'Importing…' : 'Import'}
                  </button>
                  <button
                    className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-medium flex items-center gap-2"
                    onClick={() => window.open('https://www.figma.com/', '_blank')}
                  >
                    <Play className="w-4 h-4" />
                    Open Figma
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Tip: open DevTools → Console to see <span className="font-mono">[LLM_BRIEFS]</span> after import.
                </p>
              </div>
            )}

            {/* Optional CTA */}
            <div className="max-w-4xl mx-auto px-6 py-16 text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to 10x Your Frontend Velocity?</h2>
              <p className="text-lg text-gray-400 mb-8">Import your designs and edit generated React in seconds.</p>
              <button
                onClick={() => alert('Use the Connect button above to link your Figma account.')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg flex items-center gap-2 mx-auto transition shadow-lg shadow-purple-500/50"
              >
                Connect to Figma
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* -------- Workspace tab -------- */}
      {activeTab === 'workspace' && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header actions */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Design System Components</h1>
              <p className="text-gray-400">{components.length} items imported</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition">
                <GitCompare className="w-4 h-4" />
                Visual Diff
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition">
                <Download className="w-4 h-4" />
                Export Code
              </button>
              <button
                onClick={generateSelectedWithBedrock}
                disabled={generating}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg flex items-center gap-2 transition font-semibold disabled:opacity-60"
              >
                <Rocket className="w-4 h-4" />
                {generating ? 'Generating…' : 'Generate with Bedrock'}
              </button>
            </div>
          </div>

          {/* 3-column editor */}
          <div className="grid grid-cols-12 gap-6">
            <ComponentsList
              items={components}
              selectedId={selectedComponent?.id ?? null}
              onSelect={(c) => setSelectedComponent(c)}
            />

            {/* CodeEditor with spinner overlay */}
            <div className="col-span-5 relative">
              <CodeEditor selected={selectedComponent} onChange={handleCodeChange} />
              {generating && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <Spinner />
                </div>
              )}
            </div>

            {/* Pass isGenerating to PreviewPane */}
            <PreviewPane selected={selectedComponent} isGenerating={generating} />
          </div>
        </div>
      )}
    </div>
  );
}
