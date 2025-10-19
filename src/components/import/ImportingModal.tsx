'use client'

import { Zap } from 'lucide-react'

export default function ImportingModal({ open }: { open: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Zap className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-center">Importing from Figma</h3>
        <p className="text-gray-400 text-center mb-6">Extracting components, tokens, and layouts via MCP...</p>
        <div className="space-y-3">
          {['Connecting to Figma API', 'Parsing design tokens', 'Extracting components', 'Generating React code'].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-sm text-gray-300">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
