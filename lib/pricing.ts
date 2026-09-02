import type { CartItem, Product } from '@/types'
import { isTvProduct, parseScreenDiagonalInches } from '@/lib/tv-checkout-services'

export const COURIER_DELIVERY_DEFAULT = 1000
export const COURIER_DELIVERY_EXTRA_TV = 700
/** @deprecated используйте COURIER_DELIVERY_DEFAULT */
export const COURIER_DELIVERY_COST = COURIER_DELIVERY_DEFAULT
export const CARD_SURCHARGE_RATE = 0.15
export const PIXEL_CHECK_COST = 1500
export const INSTALLATION_COST = 3000
export const REGION_COST_PER_KM_DEFAULT = 70

export function courierDeliveryPriceByDiagonal(diagonal: number | null): number {
  if (diagonal === null || diagonal < 32) return 1000
  if (diagonal >= 90) return 5500
  if (diagonal >= 83) return 3000
  if (diagonal >= 70) return 2000
  if (diagonal >= 50) return 1500
  return 1000
}

type DeliveryLineItem = {
  product: Pick<Product, 'id' | 'specs' | 'categorySlug' | 'categories'>
  quantity: number
}

type TvUnit = {
  productId: string
  basePrice: number
  diagonal: number
}

function collectTvUnits(items: CartItem[] | DeliveryLineItem[]): TvUnit[] {
  const units: TvUnit[] = []
  for (const item of items) {
    if (!isTvProduct(item.product)) continue
    const diagonal = parseScreenDiagonalInches(item.product.specs)
    const basePrice = courierDeliveryPriceByDiagonal(diagonal)
    for (let unit = 0; unit < item.quantity; unit += 1) {
      units.push({
        productId: String(item.product.id),
        basePrice,
        diagonal: diagonal ?? 0,
      })
    }
  }
  return units
}

/**
 * Разнос доставки по единицам ТВ: базовый тариф у ТВ с наибольшей диагональю
 * (при равной диагонали — с наибольшим тарифом), у остальных — COURIER_DELIVERY_EXTRA_TV.
 */
export function allocateCourierDeliveryByProduct(
  items: CartItem[] | DeliveryLineItem[]
): Map<string, number[]> {
  const units = collectTvUnits(items)
  const result = new Map<string, number[]>()
  if (units.length === 0) return result

  let primaryIndex = 0
  for (let i = 1; i < units.length; i += 1) {
    const current = units[i]
    const primary = units[primaryIndex]
    if (
      current.diagonal > primary.diagonal ||
      (current.diagonal === primary.diagonal && current.basePrice > primary.basePrice)
    ) {
      primaryIndex = i
    }
  }

  units.forEach((unit, index) => {
    const amount = index === primaryIndex ? unit.basePrice : COURIER_DELIVERY_EXTRA_TV
    const list = result.get(unit.productId) ?? []
    list.push(amount)
    result.set(unit.productId, list)
  })

  return result
}

export function calculateDeliveryCost(
  items: CartItem[] | DeliveryLineItem[],
  deliveryMethod: 'courier' | 'pickup'
): number {
  if (deliveryMethod !== 'courier') return 0

  const unitPrices = collectTvUnits(items).map((unit) => unit.basePrice)
  if (unitPrices.length === 0) return COURIER_DELIVERY_DEFAULT
  if (unitPrices.length === 1) return unitPrices[0]
  return Math.max(...unitPrices) + (unitPrices.length - 1) * COURIER_DELIVERY_EXTRA_TV
}
