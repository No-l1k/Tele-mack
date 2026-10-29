import type { HeroBanner } from '@/lib/api'

export const HERO_BANNER_MAX_BYTES = 5 * 1024 * 1024
export const HERO_BANNER_ALT_MAX = 160
export const HERO_BANNER_ACCEPT = 'image/png,image/jpeg,image/webp'
const HERO_BANNER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const HERO_BANNER_GUIDELINE =
  'Форматы: JPEG, PNG или WebP, до 5 МБ на файл. Основное фото — широкий кадр около 1800×600 px (3:1). Для телефона можно загрузить отдельный кадр 16:10; если его нет, на телефоне обрежется основное фото. Alt — текст для скринридеров. Выключенный слайд не показывается на сайте. Порядок меняется перетаскиванием или кнопками «Вверх / Вниз».'

export function normalizeHeroBanners(value: HeroBanner[] | undefined | null): HeroBanner[] {
  const list = Array.isArray(value) ? value : []
  return list
    .filter((item): item is HeroBanner => Boolean(item && typeof item.image === 'string' && item.image.trim() !== ''))
    .map((item) => ({
      id: (item.id || item.image).trim(),
      image: item.image,
      mobileImage: item.mobileImage?.trim() && item.mobileImage.trim() !== item.image ? item.mobileImage.trim() : '',
      href: item.href || '',
      alt: (item.alt || '').trim().slice(0, HERO_BANNER_ALT_MAX),
      enabled: item.enabled !== false,
    }))
}

export function toHeroBannersPayload(list: HeroBanner[]): HeroBanner[] {
  return normalizeHeroBanners(list).map((item) => ({
    ...item,
    href: sanitizeHeroHref(item.href || ''),
    alt: (item.alt || '').trim().slice(0, HERO_BANNER_ALT_MAX),
  }))
}

export function sanitizeHeroHref(value: string): string {
  const href = value.trim()
  if (!href) return ''
  if (href.startsWith('/') && !href.startsWith('//')) return href
  try {
    const url = new URL(href)
    if (url.protocol === 'http:' || url.protocol === 'https:') return href
  } catch {
    return ''
  }
  return ''
}

export function isValidHeroHref(value: string): boolean {
  const href = value.trim()
  if (!href) return true
  return sanitizeHeroHref(href) === href
}

export function heroHrefError(value: string): string | null {
  if (isValidHeroHref(value)) return null
  return 'Укажите путь сайта (/catalog/...) или ссылку http(s)://'
}

export function bannersEqual(a: HeroBanner[], b: HeroBanner[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function partitionHeroBannerFiles(files: File[]): { accepted: File[]; rejectedMessages: string[] } {
  const accepted: File[] = []
  const rejectedMessages: string[] = []

  for (const file of files) {
    if (!HERO_BANNER_MIME_TYPES.has(file.type)) {
      rejectedMessages.push(`${file.name}: нужен JPEG, PNG или WebP`)
      continue
    }
    if (file.size > HERO_BANNER_MAX_BYTES) {
      rejectedMessages.push(`${file.name}: больше 5 МБ`)
      continue
    }
    accepted.push(file)
  }

  return { accepted, rejectedMessages }
}
