'use client';

import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { AlertCircle } from 'lucide-react';

type LivePreviewProps = {
  code: string; // plain string
};

/** Strip a single fenced code block if present */
function unwrapFences(src: string): string {
  const m = src.match(/```(?:tsx|jsx|ts|js|javascript|react)?\s*([\s\S]*?)```/i);
  return (m?.[1] ?? src).trim();
}

/** Remove top-level import lines (they break eval/new Function) */
function stripImports(src: string): string {
  // very tolerant: removes lines starting with 'import' (single-line imports)
  return src.replace(/^\s*import\s+[^;]+;?\s*$/gm, '');
}

/** Very tolerant extraction of a main component name + export scrubbing */
function findMainName(src: string): { name: string | null; transformed: string } {
  let code = src;

  // Handle "export default function Name()"
  const m1 = code.match(/export\s+default\s+function\s+([A-Za-z_]\w*)\s*\(/);
  if (m1) {
    const name = m1[1];
    code = code.replace(/export\s+default\s+function\s+([A-Za-z_]\w*)\s*\(/, 'function $1(');
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  // Handle "export default Name"
  const m2 = code.match(/export\s+default\s+([A-Za-z_]\w*)/);
  if (m2) {
    const name = m2[1];
    code = code.replace(/export\s+default\s+([A-Za-z_]\w*)/, '$1');
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  // First normal function: "function Name("
  const m3 = code.match(/function\s+([A-Za-z_]\w*)\s*\(/);
  if (m3) {
    const name = m3[1];
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  // First arrow: "const Name = ("
  const m4 = code.match(/const\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(?[A-Za-z0-9_,\s]*\)?\s*=>/);
  if (m4) {
    const name = m4[1];
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  // Nothing found; still strip stray "export "
  code = code.replace(/\bexport\s+/g, '');
  return { name: null, transformed: code };
}

const CARD_W = 360;
const CARD_H = 800;

const LivePreview: React.FC<LivePreviewProps> = ({ code }) => {
  const [err, setErr] = useState<string | null>(null);
  const [Comp, setComp] = useState<React.ComponentType | null>(null);

  const cleaned = useMemo(() => {
    const unfenced = unwrapFences(code ?? '');
    const noImports = stripImports(unfenced);
    return noImports;
  }, [code]);

  useEffect(() => {
    setErr(null);
    setComp(null);
    if (!cleaned.trim()) return;

    try {
      const { name, transformed } = findMainName(cleaned);

      const wrapped = `
        'use strict';
        ${transformed}

        const pick = (n) => {
          try {
            const val = eval(n);
            if (typeof val === 'function') return val;
            if (val && typeof val === 'object') return () => val; // element -> wrap
          } catch (_) {}
          return null;
        };

        const candidates = [
          ${name ? JSON.stringify(name) : 'null'},
          'Component','App','Default','Root','Main'
        ].filter(Boolean);

        for (const c of candidates) {
          const chosen = pick(c);
          if (chosen) return chosen;
        }

        // module.exports fallback
        try {
          if (typeof module !== 'undefined' && module && module.exports) {
            const ex = module.exports.default || module.exports;
            if (typeof ex === 'function') return ex;
            if (ex && typeof ex === 'object') return () => ex;
          }
        } catch (_) {}

        return null;
      `;

      // Provide React + a dummy module/exports to user code
      const sandboxModule = { exports: {} as any };
      const sandboxExports = sandboxModule.exports;

      const fn = new Function('React', 'console', 'require', 'module', 'exports', wrapped);
      const result = fn(
        React,
        console,
        () => {
          throw new Error('Imports are not supported in preview.');
        },
        sandboxModule,
        sandboxExports
      );

      if (typeof result === 'function') {
        setComp(() => result);
      } else {
        throw new Error(
          'Could not resolve a function component. Ensure your code defines or exports a component.'
        );
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setComp(null);
    }
  }, [cleaned]);

  // ----- UI state -----
  if (err) {
    return (
      <div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-lg border border-red-500/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-semibold">Preview Error</span>
        </div>
        <pre className="text-xs opacity-80 whitespace-pre-wrap break-words">{err}</pre>
        <div className="mt-2 text-xs text-gray-400">
          Tip: Return a single component (e.g. <code>function Foo()&#123;...&#125;</code> or{' '}
          <code>const Foo = () =&gt; ...</code> or <code>export default function Foo()</code>).
        </div>
      </div>
    );
  }
  if (!Comp) return <div className="text-gray-400 text-sm">Loading preview…</div>;

  // ----- Stage wrapper: center + isolate + scale-to-fit -----
  const Stage: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const compute = () => {
        const cw = el.clientWidth - 16; // padding
        const ch = el.clientHeight - 16;
        const s = Math.min(cw / CARD_W, ch / CARD_H, 1);
        setScale(Number.isFinite(s) && s > 0 ? s : 1);
      };

      compute();
      const ro = new ResizeObserver(compute);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Wrapper that reserves scaled size so no extra scrollbars
    const scaledW = CARD_W * scale;
    const scaledH = CARD_H * scale;

    const Chosen = Comp;

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full min-h-[820px] overflow-auto grid place-items-center p-2"
      >
        <div style={{ width: scaledW, height: scaledH }}>
          <div
            style={{
              width: CARD_W,
              height: CARD_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            className="relative text-gray-900 [isolation:isolate]"
          >
            {/* Slot your user component here */}
            <Chosen />
          </div>
        </div>
      </div>
    );
  };

  return <Stage />;
};

export default LivePreview;
