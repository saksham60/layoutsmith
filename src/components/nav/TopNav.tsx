'use client'

import { Sparkles } from 'lucide-react'

type Props = {
  rightCtas?: React.ReactNode
}

export default function TopNav({ rightCtas }: Props) {
  return (
    <nav className="border-b border-white/10 backdrop-blur-xl bg-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold">Layout Smith</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-sm text-gray-300 hover:text-white transition">Docs</button>
          <button className="text-sm text-gray-300 hover:text-white transition">Pricing</button>
          {rightCtas ?? (
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition">
              Get Started
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
