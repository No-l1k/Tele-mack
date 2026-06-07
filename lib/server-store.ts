import type { Order } from '@/types'
import type { StoreSettings } from '@/lib/api'
import { fetchFromApi } from '@/lib/server-fetch'

export async function fetchPublicOrder(id: string, token: string): Promise<Order | null> {
  try {
    const res = await fetchFromApi(
      `/orders/public/${id}?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    )
    if (!res?.ok) return null
    const body = (await res.json()) as { data?: Order }
    return body.data ?? null
  } catch {
    return null
  }
}

export async function fetchPublicSettings(): Promise<StoreSettings | null> {
  try {
    const res = await fetchFromApi('/public/settings', {
      next: { revalidate: 120 },
    })
    if (!res?.ok) return null
    const body = (await res.json()) as { data?: StoreSettings }
    return body.data ?? null
  } catch {
    // next build в Docker: API ещё недоступен — layout/404 не должны падать
    return null
  }
}
