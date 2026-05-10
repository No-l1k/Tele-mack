const STORAGE_KEY = 'guest_order_access_v1'

export interface SavedOrderAccess {
  orderId: string
  orderNumber: number
  token: string
  createdAt: string
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getSavedOrderAccesses(): SavedOrderAccess[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && item.orderId && item.token)
  } catch {
    return []
  }
}

export function saveOrderAccess(entry: SavedOrderAccess) {
  if (!canUseStorage()) return
  const existing = getSavedOrderAccesses()
  const next = [
    entry,
    ...existing.filter((item) => item.orderId !== entry.orderId),
  ].slice(0, 20)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
