'use client';

import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { AlertCircle } from 'lucide-react';

type LivePreviewProps = { code: string };

function unwrapFences(src: string): string {
  const m = src.match(/```(?:tsx|jsx|ts|js|javascript|react)?\s*([\s\S]*?)```/i);
  return (m?.[1] ?? src).trim();
}
function stripImports(src: string): string {
  return src.replace(/^\s*import\s+[^;]+;?\s*$/gm, '');
}

/** Parse out a component name and scrub exports */
function findMainName(src: string): { name: string | null; transformed: string } {
  let code = src;

  const m1 = code.match(/export\s+default\s+function\s+([A-Za-z_]\w*)\s*\(/);
  if (m1) {
    const name = m1[1];
    code = code.replace(/export\s+default\s+function\s+([A-Za-z_]\w*)\s*\(/, 'function $1(');
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  const m2 = code.match(/export\s+default\s+([A-Za-z_]\w*)/);
  if (m2) {
    const name = m2[1];
    code = code.replace(/export\s+default\s+([A-Za-z_]\w*)/, '$1');
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  const m3 = code.match(/function\s+([A-Za-z_]\w*)\s*\(/);
  if (m3) {
    const name = m3[1];
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  const m4 = code.match(/const\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(?[A-Za-z0-9_,\s]*\)?\s*=>/);
  if (m4) {
    const name = m4[1];
    code = code.replace(/\bexport\s+/g, '');
    return { name, transformed: code };
  }

  code = code.replace(/\bexport\s+/g, '');
  return { name: null, transformed: code };
}

const CARD_W = 360;
const CARD_H = 800;

const LivePreview: React.FC<LivePreviewProps> = ({ code }) => {
  const [err, setErr] = useState<string | null>(null);
  const [Comp, setComp] = useState<React.ComponentType | null>(null);

  const cleaned = useMemo(() => stripImports(unwrapFences(code ?? '')), [code]);

  useEffect(() => {
    setErr(null);
    setComp(null);
    if (!cleaned.trim()) return;

    try {
      const { name, transformed } = findMainName(cleaned);

      const wrapped = `
        'use strict';
        // user code
        ${transformed}

        const isElem = (v) => !!(typeof React !== 'undefined' && React && React.isValidElement && React.isValidElement(v));

        const pick = (n) => {
          try {
            const val = eval(n);
            if (typeof val === 'function') return val;          // function component
            if (isElem(val)) return () => val;                  // direct React element
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

        // CommonJS fallback
        try {
          if (typeof module !== 'undefined' && module && module.exports) {
            const ex = module.exports.default || module.exports;
            if (typeof ex === 'function') return ex;
            if (isElem(ex)) return () => ex;
          }
        } catch (_) {}

        // If user code directly returned an element from top-level (rare), expose it:
        try {
          if (typeof exports !== 'undefined' && exports && isElem(exports.default)) {
            return () => exports.default;
          }
        } catch (_) {}

        return null;
      `;

      const sandboxModule = { exports: {} as any };
      const fn = new Function('React', 'console', 'require', 'module', 'exports', wrapped);
      const result = fn(
        React,
        console,
        () => { throw new Error('Imports are not supported in preview.'); },
        sandboxModule,
        sandboxModule.exports
      );

      if (typeof result === 'function') {
        setComp(() => result);
      } else if (React.isValidElement(result)) {
        // just in case the wrapper returns an element directly
        setComp(() => () => result as React.ReactElement);
      } else {
        throw new Error('Could not resolve a function component. Ensure your code defines or exports a component.');
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setComp(null);
    }
  }, [cleaned]);

  if (err) {
    return (
      <div className="text-red-400 text-sm p-4 bg-red-500/10 rounded-lg border border-red-500/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-semibold">Preview Error</span>
        </div>
        <pre className="text-xs opacity-80 whitespace-pre-wrap break-words">{err}</pre>
        <div className="mt-2 text-xs text-gray-400">
          Tip: Return a single component (e.g. <code>function Foo()&#123;...&#125;</code>,{' '}
          <code>const Foo = () =&gt; ...</code>, or <code>export default function Foo()</code>).
        </div>
      </div>
    );
  }
  if (!Comp) return <div className="text-gray-400 text-sm">Loading preview…</div>;

  const Stage: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const compute = () => {
        const cw = el.clientWidth - 16;
        const ch = el.clientHeight - 16;
        const s = Math.min(cw / CARD_W, ch / CARD_H, 1);
        setScale(Number.isFinite(s) && s > 0 ? s : 1);
      };
      compute();
      const ro = new ResizeObserver(compute);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const scaledW = CARD_W * scale;
    const scaledH = CARD_H * scale;
    const Chosen = Comp;

    return (
      <div ref={containerRef} className="relative w-full h-full min-h-[820px] overflow-auto grid place-items-center p-2">
        <div style={{ width: scaledW, height: scaledH }}>
          <div
            style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            className="relative text-gray-900 [isolation:isolate]"
          >
            <Chosen />
          </div>
        </div>
      </div>
    );
  };

  return <Stage />;
};

export default LivePreview;
