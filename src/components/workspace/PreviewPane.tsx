'use client'

/**
 * PreviewPane.tsx
 * ----------------------------
 * Renders a live preview for the currently selected component.
 * - Never renders raw objects (avoids "Objects are not valid as a React child")
 * - Passes only the code string into LivePreview
 * - Optional "generating" overlay spinner while code is being produced
 */

import { Check, Eye, Loader2 } from 'lucide-react'
import LivePreview from '@/components/preview/LivePreview'
import type { ComponentItem } from '@/components/types'

type Props = {
  selected: ComponentItem | null
  /** When true, show a spinner overlay (e.g., while Bedrock is generating). */
  generating?: boolean
}

export default function PreviewPane({ selected, generating = false }: Props) {
  // Always pass a string to LivePreview; never the whole object.
  const code: string = typeof selected?.code === 'string' ? selected!.code : ''

  return (
    <div className="col-span-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Live Preview</span>
        </div>
        <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
          <Check className="w-3 h-3" />
          Auto-sync
        </div>
      </div>

      {/* Body */}
      <div className="p-6 h-[600px] overflow-y-auto">
        {/* Nothing selected */}
        {!selected ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Preview will appear here</p>
            </div>
          </div>
        ) : (
          // Selected but maybe empty code
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 min-h-full flex items-center justify-center">
            {/* Loading overlay while generating */}
            {generating && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex items-center gap-3 text-sm text-gray-200">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating preview…</span>
                </div>
              </div>
            )}

            <div className="w-full max-w-md mx-auto">
              {code.trim() ? (
                <LivePreview code={code} />
              ) : (
                <div className="text-center text-gray-400">
                  <p>No code yet. Click “Generate” or paste your component code.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
