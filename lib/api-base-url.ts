/**
 * Базовый URL API для fetch.
 *
 * Браузер: `NEXT_PUBLIC_API_URL=/api` → текущий origin (nginx проксирует на FastAPI).
 * SSR в Docker: прямой вызов сервиса backend (см. API_URL_INTERNAL в compose).
 */
function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

export function getApiBaseUrl(): string {
  const pub = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    if (pub.startsWith('http')) {
      return pub
    }
    const path = pub.startsWith('/') ? pub : `/${pub}`
    return `${window.location.origin}${path}`.replace(/\/+$/, '')
  }

  const internal = process.env.API_URL_INTERNAL?.replace(/\/+$/, '')
  if (internal) {
    return internal
  }

  if (pub.startsWith('http')) {
    return pub
  }

  if (isNextProductionBuild()) {
    return 'http://127.0.0.1:8000/api'
  }

  // next start в docker-compose без API_URL_INTERNAL (редко)
  if (process.env.NODE_ENV === 'production') {
    return 'http://backend:8000/api'
  }

  return 'http://127.0.0.1:8000/api'
}
