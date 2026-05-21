/**
 * Базовый URL API для fetch.
 *
 * В браузере `NEXT_PUBLIC_API_URL=/api` резолвится в текущий origin (nginx отдаёт на FastAPI).
 * На сервере Next в Docker относительный `/api` указывает на сам контейнер фронта, где маршрутов API нет —
 * SSR зависает. Для сервера используем API_URL_INTERNAL (например http://backend:8000/api).
 */
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

  // Относительный /api на сервере без API_URL_INTERNAL (например `next build` в Docker).
  // Не используем hostname backend — его нет на этапе сборки образа.
  return 'http://127.0.0.1:8000/api'
}
