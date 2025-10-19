import { NextRequest, NextResponse } from 'next/server'

/**
 * Minimal Figma → Components extractor
 * POST /api/figma/extract
 * Body: { fileKey: string, nodeIds?: string[] }
 * Header: X-Figma-Token: <OAuth access_token>
 *
 * Returns: { components: Array<{ id, name, nodeId, code, previewUrl? }> }
 */

type FigmaDocument = {
  document: FigmaNode
  components?: Record<string, any>
}

type FigmaNode = {
  id: string
  name: string
  type: string
  absoluteBoundingBox?: { width: number; height: number }
  layoutMode?: 'HORIZONTAL' | 'VERTICAL'
  primaryAxisSizingMode?: 'FIXED' | 'AUTO'
  counterAxisSizingMode?: 'FIXED' | 'AUTO'
  itemSpacing?: number
  fills?: any[]
  strokes?: any[]
  children?: FigmaNode[]
  characters?: string
  style?: { fontSize?: number; fontWeight?: number }
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('x-figma-token') || ''
    if (!token) return bad('Missing X-Figma-Token header', 401)

    const { fileKey, nodeIds } = await req.json()
    if (!fileKey) return bad('fileKey required')

    // 1) Pull the file document
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token },
      // NOTE: If you used OAuth instead of personal token:
      // headers: { Authorization: `Bearer ${token}` }
    })
    if (!fileRes.ok) {
      const t = await fileRes.text()
      return bad(`Figma /files error: ${fileRes.status} ${t}`, 502)
    }
    const fileJson = (await fileRes.json()) as FigmaDocument

    // 2) Decide which roots become components.
    // Fastest heuristic: collect top-level FRAMES and COMPONENT nodes.
    const roots: FigmaNode[] = []
    const visit = (n: FigmaNode, depth: number) => {
      const eligible =
        n.type === 'COMPONENT' ||
        (depth <= 2 && (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'INSTANCE'))

      if (eligible) roots.push(n)
      n.children?.forEach((c) => visit(c, depth + 1))
    }
    visit(fileJson.document, 0)

    // If caller passed explicit nodeIds, filter to those
    const chosen = Array.isArray(nodeIds) && nodeIds.length
      ? roots.filter((r) => nodeIds.includes(r.id))
      : roots.slice(0, 30) // cap for speed

    // 3) Generate React code per node
    const components = chosen.map((node, idx) => {
      const safeName = toSafeName(node.name || `Comp${idx + 1}`)
      const code = nodeToReact(node)
      return {
        id: `${idx + 1}`,
        name: node.name || safeName,
        nodeId: node.id,
        code,
      }
    })

    // Optional: request preview images for roots
    if (components.length) {
      const ids = chosen.map((n) => n.id).join(',')
      const imgRes = await fetch(
        `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`,
        { headers: { 'X-Figma-Token': token } }
      )
      if (imgRes.ok) {
        const imgJson = await imgRes.json()
        components.forEach((c, i) => {
          const url = imgJson.images?.[chosen[i].id]
          if (url) (c as any).previewUrl = url
        })
      }
    }

    return NextResponse.json({ components })
  } catch (err: any) {
    return bad(`Server error: ${err?.message || String(err)}`, 500)
  }
}

/* ---------- helpers: crude node → React generator ---------- */

function toSafeName(name: string) {
  const stripped = name.replace(/[^\w]/g, '')
  return stripped.length ? stripped : 'Component'
}

// Tailwind-ish mapping for nodes
function nodeToReact(node: FigmaNode): string {
  const lines: string[] = []
  lines.push(`function ${toSafeName(node.name)}() {`)
  lines.push(`  return (`)
  lines.push(renderNode(node, 2))
  lines.push(`  )`)
  lines.push(`}`)
  return lines.join('\n')
}

function renderNode(n: FigmaNode, indent = 0): string {
  const pad = ' '.repeat(indent)

  // Text node
  if (n.type === 'TEXT' && n.characters != null) {
    const size = n.style?.fontSize ? ` text-[${n.style.fontSize}px]` : ''
    const weight = n.style?.fontWeight ? ` font-[${n.style.fontWeight}]` : ''
    return `${pad}<p className="text-gray-200${size}${weight}">${escapeHtml(
      n.characters
    )}</p>`
  }

  // Image fill? (very simplified)
  const hasImageFill = Array.isArray(n.fills) && n.fills.some((f: any) => f.type === 'IMAGE')

  // Container
  const isFlex =
    n.layoutMode === 'HORIZONTAL' || n.layoutMode === 'VERTICAL'
  const flexDir =
    n.layoutMode === 'HORIZONTAL' ? 'flex-row' :
    n.layoutMode === 'VERTICAL' ? 'flex-col' : ''
  const gap =
    n.itemSpacing != null && n.itemSpacing > 0 ? ` gap-[${n.itemSpacing}px]` : ''
  const size =
    n.absoluteBoundingBox
      ? ` w-[${Math.round(n.absoluteBoundingBox.width)}px] h-[${Math.round(
          n.absoluteBoundingBox.height
        )}px]`
      : ''

  const baseClass = isFlex ? `flex ${flexDir}${gap}` : 'block'
  const imgBg = hasImageFill ? ' bg-gray-700' : ''
  const className = `${baseClass}${imgBg}${size}`

  const children = (n.children || []).map((c) => renderNode(c, indent + 2)).join('\n')

  // If this looks like just an image frame, show <img/>
  if (hasImageFill && (!n.children || n.children.length === 0)) {
    // We don’t have the actual bitmap URL here; you can post-process with /images call on node.id
    return `${pad}<img className="${className}" alt="${escapeHtml(n.name)}" />`
  }

  return `${pad}<div className="${className}">\n${children}\n${pad}</div>`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
