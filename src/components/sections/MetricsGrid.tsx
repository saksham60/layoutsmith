'use client'

import type { ComponentType } from 'react'

type Metric = {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}

export default function MetricsGrid({ metrics }: { metrics: readonly Metric[] }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="grid md:grid-cols-4 gap-6">
        {metrics.map((metric, i) => {
          const Icon = metric.icon
          return (
            <div key={i} className="p-6 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-xl">
              <Icon className="w-8 h-8 text-purple-400 mb-4" />
              <div className="text-3xl font-bold mb-1">{metric.value}</div>
              <div className="text-sm text-gray-400">{metric.label}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
