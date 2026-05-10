import { siteConfig } from '@/lib/site'

/**
 * Origin для файлов /uploads (отдаются через тот же хост, что и API).
 */
function parseSiteUrlOrigin(urlString: string): string {
  try {
    const normalized = urlString.includes('://') ? urlString : `https://${urlString}`
    return new URL(normalized).origin
  } catch {
    return 'http://localhost:3000'
  }
}

/**
 * Превращает пути вида /uploads/... в полный URL бэкенда (файлы отдаются не с Next, а с API).
 * Абсолютные http(s) и локальные ассеты из /public возвращаются без изменений.
 */
function backendOrigin(): string {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').trim()

  // Тот же домен, что и витрина (nginx: /api и /uploads на один backend). Нельзя сводить к localhost.
  if (apiBase.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return parseSiteUrlOrigin(siteConfig.url)
  }

  let origin = apiBase.replace(/\/?api\/?$/i, '').replace(/\/$/, '') || 'http://localhost:8000'

  if (typeof window !== 'undefined') {
    const { hostname } = window.location
    // Фронт на 127.0.0.1, а в env localhost — браузер грузит картинки с другого «хоста»
    if (hostname === '127.0.0.1' && origin.includes('localhost')) {
      origin = origin.replace(/localhost/g, '127.0.0.1')
    }
    if (hostname === 'localhost' && origin.includes('127.0.0.1')) {
      origin = origin.replace(/127\.0\.0\.1/g, 'localhost')
    }
  }

  return origin
}

export function resolveMediaUrl(path: string | undefined | null): string {
  if (path == null || path === '') {
    return '/placeholder.svg'
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  // Статика Next из public (не с API)
  if (normalized.startsWith('/') && !normalized.startsWith('/uploads')) {
    return normalized
  }
  const origin = backendOrigin()
  return `${origin}${normalized.startsWith('/') ? normalized : `/${normalized}`}`
}
