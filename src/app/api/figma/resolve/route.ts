import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/figma/resolve
 * Body: { input: string }
 * Accepts:
 *   - full <iframe ... src="https://embed.figma.com/design/<FILE_KEY>/..." />
 *   - https://www.figma.com/file/<FILE_KEY>/...
 *   - https://embed.figma.com/design/<FILE_KEY>/...
 * Returns: { fileKey: string, nodeId?: string }
 */
export async function POST(req: NextRequest) {
  const { input } = await req.json()
  if (!input) return NextResponse.json({ error: 'input required' }, { status: 400 })

  const src = extractSrc(input)
  const url = new URL(src)

  // Handle both www.figma.com/file/... and embed.figma.com/design/...
  let fileKey = ''
  if (url.hostname.includes('embed.figma.com')) {
    // /design/<FILE_KEY>/... or /proto/<FILE_KEY>/...
    const parts = url.pathname.split('/').filter(Boolean)
    // e.g. ["design", "<FILE_KEY>", ...]
    fileKey = parts[1] || ''
  } else {
    // www.figma.com/file/<FILE_KEY>/...
    const parts = url.pathname.split('/').filter(Boolean)
    // e.g. ["file", "<FILE_KEY>", ...]
    fileKey = parts[1] || ''
  }

  const nodeId = url.searchParams.get('node-id') || undefined
  if (!fileKey) return NextResponse.json({ error: 'Could not parse file key' }, { status: 400 })
  return NextResponse.json({ fileKey, nodeId })
}

function extractSrc(input: string) {
  if (input.includes('<iframe')) {
    const m = input.match(/src="([^"]+)"/i)
    if (m) return m[1]
  }
  return input.trim()
}
