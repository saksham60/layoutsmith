'use client'

import { Upload, Code, Rocket } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    { icon: Upload, title: 'Import Design', desc: 'Connect Figma via MCP. Auto-extract tokens, variants & layout structure.' },
    { icon: Code,   title: 'Generate Components', desc: 'AI converts designs to clean React + TypeScript with accessibility.' },
    { icon: Rocket, title: 'Deploy Instantly', desc: 'Visual diff verification and deploy/export in one click.' },
  ] as const

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={i} className="relative p-8 bg-gradient-to-b from-white/5 to-white/0 border border-white/10 rounded-2xl hover:border-purple-500/50 transition group">
              <div className="absolute top-4 right-4 text-6xl font-bold text-white/5">{i + 1}</div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Icon className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-gray-400">{step.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
