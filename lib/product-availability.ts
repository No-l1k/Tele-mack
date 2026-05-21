import type { Product } from '@/types'

/** Статусы, при которых можно добавить в корзину и оформить заказ. */
export const PURCHASABLE_STOCK_STATUSES = ['in_stock', 'low_stock'] as const

export function isProductAvailableForPurchase(
  product: Pick<Product, 'stockStatus' | 'inStock'>
): boolean {
  return (
    PURCHASABLE_STOCK_STATUSES.includes(
      product.stockStatus as (typeof PURCHASABLE_STOCK_STATUSES)[number]
    ) || product.inStock
  )
}
