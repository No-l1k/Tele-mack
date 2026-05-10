import type { Order } from '@/types'
import type { StoreSettings } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export async function fetchPublicOrder(id: string, token: string): Promise<Order | null> {
  const url = `${API_BASE}/orders/public/${id}?token=${encodeURIComponent(token)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const body = (await res.json()) as { data?: Order }
  return body.data ?? null
}

export async function fetchPublicSettings(): Promise<StoreSettings | null> {
  const res = await fetch(`${API_BASE}/public/settings`, {
    next: { revalidate: 120 },
  })
  if (!res.ok) return null
  const body = (await res.json()) as { data?: StoreSettings }
  return body.data ?? null
}
