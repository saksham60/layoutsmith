'use client'

import { Layout, Settings } from 'lucide-react'
import type { ComponentItem } from '@/components/types'

type Props = {
  items: ComponentItem[]
  selectedId: number | null
  onSelect: (comp: ComponentItem) => void
}

export default function ComponentsList({ items, selectedId, onSelect }: Props) {
  return (
    <div className="col-span-3 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-400">COMPONENTS</span>
        <Settings className="w-4 h-4 text-gray-400" />
      </div>
      {items.map((comp) => (
        <button
          key={comp.id}
          onClick={() => onSelect(comp)}
          className={`w-full p-4 rounded-xl text-left transition ${
            selectedId === comp.id
              ? 'bg-purple-500/20 border-2 border-purple-500'
              : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Layout className="w-5 h-5 text-purple-400" />
            <span className="font-semibold">{comp.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{comp.type}</span>
            <span>•</span>
            <span>{comp.variants} variants</span>
          </div>
        </button>
      ))}
    </div>
  )
}
