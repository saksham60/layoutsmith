'use client'

import { Check, ArrowRight, FileCode } from 'lucide-react'
import type { FigmaFile } from '@/components/types'

type Props = {
  files: FigmaFile[]
  onDisconnect: () => void
  onImport: (file: FigmaFile) => void
}

export default function FigmaConnected({ files, onDisconnect, onImport }: Props) {
  return (
    <div className="max-w-5xl mx-auto mb-20">
      <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold">Connected to Figma</h3>
              <p className="text-sm text-gray-400">Select a file to import components</p>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition"
          >
            Disconnect
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onImport(file)}
              className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl text-left transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                  <FileCode className="w-6 h-6 text-purple-400" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition" />
              </div>
              <h4 className="font-semibold mb-1">{file.name}</h4>
              <p className="text-sm text-gray-400">Modified {file.lastModified}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
