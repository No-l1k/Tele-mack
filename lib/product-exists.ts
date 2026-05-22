/**
 * Быстрая проверка товара для middleware (до стрима страницы → реальный HTTP 404).
 */

function apiBaseForMiddleware(): string {
  const internal = process.env.API_URL_INTERNAL?.replace(/\/+$/, '')
  if (internal) return internal

  const pub = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
  if (pub.startsWith('http')) return pub

  return 'http://127.0.0.1:8000/api'
}

/** true — есть; false — 404; null — не удалось проверить (пусть рендерит page). */
export async function checkProductSegmentExists(segment: string): Promise<boolean | null> {
  const base = apiBaseForMiddleware()
  const isNumericSegment = /^\d+$/.test(segment)
  const endpoints = isNumericSegment
    ? [`${base}/products/${segment}`, `${base}/products/slug/${segment}`]
    : [`${base}/products/slug/${segment}`]

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (response.ok) return true
      if (response.status === 404) continue
      return null
    } catch {
      return null
    }
  }

  return false
}
