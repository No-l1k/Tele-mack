import { getApiBaseUrl, isNextProductionBuild } from '@/lib/api-base-url'

const API_FETCH_TIMEOUT_MS = 8000

/**
 * SSR fetch к FastAPI с таймаутом.
 * Во время `next build` API недоступен — сразу возвращаем null (без ожидания).
 */
export async function fetchFromApi(
  endpoint: string,
  init?: RequestInit,
): Promise<Response | null> {
  if (isNextProductionBuild()) {
    return null
  }

  const base = getApiBaseUrl()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS)

  try {
    return await fetch(`${base}${endpoint}`, {
      ...init,
      signal: controller.signal,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
