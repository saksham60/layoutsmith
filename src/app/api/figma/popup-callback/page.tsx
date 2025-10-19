'use client'
import { useEffect } from 'react'

export default function FigmaPopupCallback() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    // sanity: verify state matches what we stored (optional here since exchange will also validate server-side if you want)
    // const expected = localStorage.getItem('figma_oauth_state')

    if (code) {
      try {
        window.opener?.postMessage({ type: 'figma_oauth_code', code, state }, window.location.origin)
      } catch {}
      window.close()
    }
  }, [])

  return null
}
