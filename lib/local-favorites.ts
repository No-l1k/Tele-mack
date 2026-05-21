import type { Product } from '@/types'

const IDS_STORAGE_KEY = 'telemakc-favorites'
const PRODUCTS_STORAGE_KEY = 'telemakc-favorites-products-v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function normalizeFavoriteProductId(productId: string | number): string {
  return String(productId)
}

export function getStoredFavoriteIds(): string[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(IDS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map((id) => normalizeFavoriteProductId(id)).filter(Boolean))]
  } catch {
    return []
  }
}

export function setStoredFavoriteIds(ids: string[]) {
  if (!canUseStorage()) return
  const unique = [...new Set(ids.map((id) => normalizeFavoriteProductId(id)).filter(Boolean))]
  window.localStorage.setItem(IDS_STORAGE_KEY, JSON.stringify(unique))
}

export function getStoredFavoriteProducts(): Record<string, Product> {
  if (!canUseStorage()) return {}
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string, Product> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === 'object' && 'id' in value && 'name' in value) {
        const id = normalizeFavoriteProductId((value as Product).id ?? key)
        result[id] = { ...(value as Product), id }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function setStoredFavoriteProducts(productsById: Record<string, Product>) {
  if (!canUseStorage()) return
  window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(productsById))
}

export function upsertStoredFavoriteProduct(product: Product) {
  const id = normalizeFavoriteProductId(product.id)
  const products = getStoredFavoriteProducts()
  products[id] = { ...product, id }
  setStoredFavoriteProducts(products)
}

export function removeStoredFavoriteProduct(productId: string | number) {
  const id = normalizeFavoriteProductId(productId)
  const products = getStoredFavoriteProducts()
  if (!(id in products)) return
  delete products[id]
  setStoredFavoriteProducts(products)
}
