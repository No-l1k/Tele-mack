import type { CartItem, Product } from '@/types'
import type { CheckoutService } from '@/lib/api'
import { formatPrice } from '@/lib/formatters'

export const TV_SCREEN_DIAGONAL_SPEC = 'Диагональ экрана (дюйм)'

export const LEGACY_TV_CHECKOUT_SERVICE_IDS = ['pixel-check', 'installation'] as const

export const TV_EXTRA_WARRANTY_PRICE = 8000

const TV_CATEGORY_KEYWORDS = ['телевиз', 'televizor', 'tv']

export function isTvProduct(product: Pick<Product, 'specs' | 'categorySlug' | 'categories'>): boolean {
  if (TV_SCREEN_DIAGONAL_SPEC in (product.specs ?? {})) {
    return true
  }
  const slugs = new Set<string>()
  if (product.categorySlug) {
    slugs.add(product.categorySlug.toLowerCase())
  }
  for (const category of product.categories ?? []) {
    if (category.slug) {
      slugs.add(category.slug.toLowerCase())
    }
  }
  return Array.from(slugs).some((slug) => TV_CATEGORY_KEYWORDS.some((keyword) => slug.includes(keyword)))
}

export function parseScreenDiagonalInches(
  specs: Record<string, string | string[] | number | boolean> | undefined
): number | null {
  if (!specs) return null
  const raw = specs[TV_SCREEN_DIAGONAL_SPEC]
  if (raw === undefined || raw === null || raw === '') return null
  const text = String(raw)
  const match = text.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  return Math.round(parseFloat(match[1].replace(',', '.')))
}

export function pixelCheckPrice(diagonal: number | null): number {
  if (diagonal === null) return 1500
  if (diagonal > 97) return 5500
  if (diagonal >= 83) return 4500
  if (diagonal >= 65) return 3500
  if (diagonal >= 50) return 2000
  return 1500
}

export function installationPrice(diagonal: number | null): number {
  if (diagonal === null) return 5500
  if (diagonal >= 110) return 35000
  if (diagonal >= 90) return 20000
  if (diagonal >= 75) return 12000
  if (diagonal >= 55) return 7500
  return 5500
}

export function tvPixelCheckServiceId(productId: string, unitIndex: number): string {
  return `tv-pixel:${productId}:${unitIndex}`
}

export function tvInstallationServiceId(productId: string, unitIndex: number): string {
  return `tv-install:${productId}:${unitIndex}`
}

export function tvExtraWarrantyServiceId(productId: string, unitIndex: number): string {
  return `tv-warranty:${productId}:${unitIndex}`
}

export function isDynamicTvCheckoutServiceId(serviceId: string): boolean {
  return (
    serviceId.startsWith('tv-pixel:') ||
    serviceId.startsWith('tv-install:') ||
    serviceId.startsWith('tv-warranty:')
  )
}

export function buildTvCheckoutServices(
  items: CartItem[],
  sortOrderBase = 0
): CheckoutService[] {
  const services: CheckoutService[] = []
  let sortOrder = sortOrderBase

  for (const item of items) {
    if (!isTvProduct(item.product)) continue

    const diagonal = parseScreenDiagonalInches(item.product.specs)
    const pixelPrice = pixelCheckPrice(diagonal)
    const installPrice = installationPrice(diagonal)

    for (let unit = 0; unit < item.quantity; unit++) {
      const unitSuffix = item.quantity > 1 ? ` (${unit + 1}-й)` : ''

      services.push({
        id: tvPixelCheckServiceId(item.product.id, unit),
        name: `Проверка «${item.product.name}» на битые пиксели — ${formatPrice(pixelPrice)}${unitSuffix}`,
        price: pixelPrice,
        enabled: true,
        sortOrder: sortOrder++,
      })

      services.push({
        id: tvInstallationServiceId(item.product.id, unit),
        name: `Установка «${item.product.name}» — ${formatPrice(installPrice)}${unitSuffix}`,
        price: installPrice,
        enabled: true,
        sortOrder: sortOrder++,
      })

      services.push({
        id: tvExtraWarrantyServiceId(item.product.id, unit),
        name: `Дополнительная гарантия на 1 год для «${item.product.name}» — ${formatPrice(TV_EXTRA_WARRANTY_PRICE)}${unitSuffix}`,
        price: TV_EXTRA_WARRANTY_PRICE,
        enabled: true,
        sortOrder: sortOrder++,
      })
    }
  }

  return services
}
