'use client'

import { FileCode } from 'lucide-react'
import type { ComponentItem } from '@/components/types'

type Props = {
  selected: ComponentItem | null
  onChange: (code: string) => void
}

export default function CodeEditor({ selected, onChange }: Props) {
  return (
    <div className="col-span-5 bg-slate-950 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold">
            {selected ? `${selected.name}.tsx` : 'Select a component'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        </div>
      </div>
      <div className="p-6 h-[600px] overflow-y-auto">
        {selected ? (
          <textarea
            className="w-full h-full bg-transparent text-sm font-mono resize-none focus:outline-none text-gray-300 leading-relaxed"
            value={selected.code}
            onChange={(e) => onChange(e.target.value)}
            placeholder="// Your React component code here..."
            spellCheck="false"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileCode className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select a component to view and edit code</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
