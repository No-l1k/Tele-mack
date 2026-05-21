import { siteConfig } from '@/lib/site'
import { formatPriceShort } from '@/lib/formatters'

export const META_TITLE_MAX = 255
export const META_DESCRIPTION_MAX = 500

export type ProductSeoInput = {
  name: string
  slug: string
  price: number
  brand?: string
  categoryName?: string
  storeName?: string
  storePhone?: string
}

export type ProductSeoPreview = {
  title: string
  url: string
  description: string
  isTitleCustom: boolean
  isDescriptionCustom: boolean
}

export function getProductSeoSiteHost(): string {
  try {
    const { hostname } = new URL(siteConfig.url)
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      return hostname + (new URL(siteConfig.url).port ? `:${new URL(siteConfig.url).port}` : '')
    }
    return hostname.startsWith('www.') ? hostname : `www.${hostname}`
  } catch {
    return 'tele-makc.ru'
  }
}

export function buildProductSeoUrl(slug: string): string {
  const host = getProductSeoSiteHost()
  const path = `/product/${slug || 'product'}`
  if (host.includes('localhost') || host.includes(':')) {
    return `${siteConfig.url.replace(/\/$/, '')}${path}`
  }
  return `${host}${path}`
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

export function generateProductSeoTitle(
  input: ProductSeoInput,
  storeName = siteConfig.name
): string {
  const name = input.name.trim()
  if (!name) return ''
  return truncate(`${name} - купить по выгодной цене | ${storeName}`, META_TITLE_MAX)
}

export function generateProductSeoDescription(
  input: ProductSeoInput,
  storeName = siteConfig.name,
  storePhone = ''
): string {
  const name = input.name.trim()
  if (!name) return ''
  const pricePart = input.price > 0 ? `Цена - ${formatPriceShort(input.price)} руб.` : 'Цена по запросу'
  const section = (input.brand?.trim() || input.categoryName?.trim() || '').trim()
  const sectionPart = section ? `Смотрите все товары в разделе «${section}».` : ''
  const phonePart = storePhone.trim()
    ? `Чтобы оформить заказ, звоните ${storePhone.trim()}.`
    : 'Чтобы оформить заказ, свяжитесь с нами по телефону на сайте.'

  const text = [
    `${name} - ${pricePart} в ${storeName}.`,
    'Быстрая доставка.',
    phonePart,
    sectionPart,
  ]
    .filter(Boolean)
    .join('  ')

  return truncate(text, META_DESCRIPTION_MAX)
}

export function resolveProductSeoTitle(
  input: ProductSeoInput,
  customTitle?: string | null,
  storeName?: string
): string {
  const custom = (customTitle ?? '').trim()
  if (custom) return truncate(custom, META_TITLE_MAX)
  return generateProductSeoTitle(input, storeName)
}

export function resolveProductSeoDescription(
  input: ProductSeoInput,
  customDescription?: string | null,
  storeName?: string,
  storePhone?: string
): string {
  const custom = (customDescription ?? '').trim()
  if (custom) return truncate(custom, META_DESCRIPTION_MAX)
  return generateProductSeoDescription(input, storeName, storePhone)
}

export function buildProductSeoPreview(
  input: ProductSeoInput,
  customTitle?: string | null,
  customDescription?: string | null,
  storeName?: string,
  storePhone?: string
): ProductSeoPreview {
  const generatedTitle = generateProductSeoTitle(input, storeName)
  const generatedDescription = generateProductSeoDescription(input, storeName, storePhone)
  const titleCustom = Boolean((customTitle ?? '').trim())
  const descriptionCustom = Boolean((customDescription ?? '').trim())

  return {
    title: titleCustom ? truncate((customTitle ?? '').trim(), META_TITLE_MAX) : generatedTitle,
    url: buildProductSeoUrl(input.slug),
    description: descriptionCustom
      ? truncate((customDescription ?? '').trim(), META_DESCRIPTION_MAX)
      : generatedDescription,
    isTitleCustom: titleCustom,
    isDescriptionCustom: descriptionCustom,
  }
}

/** Пустое или совпадает с автогенерацией — в БД не сохраняем (будет пересчитываться). */
export function normalizeMetaTitleForSave(
  input: ProductSeoInput,
  value: string | null | undefined,
  storeName?: string
): string | undefined {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return undefined
  if (trimmed === generateProductSeoTitle(input, storeName)) return undefined
  return truncate(trimmed, META_TITLE_MAX)
}

export function normalizeMetaDescriptionForSave(
  input: ProductSeoInput,
  value: string | null | undefined,
  storeName?: string,
  storePhone?: string
): string | undefined {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return undefined
  if (trimmed === generateProductSeoDescription(input, storeName, storePhone)) return undefined
  return truncate(trimmed, META_DESCRIPTION_MAX)
}
