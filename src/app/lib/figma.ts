// Reads the token we saved in sessionStorage after OAuth popup
export function getFigmaToken(): { access_token: string } | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('figma_token')
  return raw ? JSON.parse(raw) : null
}

async function figmaFetch(path: string) {
  const tok = getFigmaToken()
  if (!tok) throw new Error('No Figma token — connect first.')
  const r = await fetch(`https://api.figma.com${path}`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  })
  if (!r.ok) throw new Error(`Figma ${r.status}: ${await r.text()}`)
  return r.json()
}

export async function getFileComponents(fileKey: string) {
  // Components + styles metadata
  const [comps, styles] = await Promise.all([
    figmaFetch(`/v1/files/${fileKey}/components`),
    figmaFetch(`/v1/files/${fileKey}/styles`),
  ])
  return {
    components: comps?.meta?.components ?? [],
    styles: styles?.meta?.styles ?? [],
  }
}
