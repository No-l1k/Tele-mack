/** Сегмент URL вида /product/63 (только цифры). */
export function isNumericProductSegment(segment: string): boolean {
  return /^\d+$/.test(segment)
}

export function productPagePath(slug: string): string {
  const normalized = slug.trim()
  return `/product/${encodeURIComponent(normalized)}`
}

/** Редирект на канонический URL по slug, если открыли товар по числовому id. */
export function shouldRedirectProductSegmentToSlug(segment: string, slug: string): boolean {
  if (!isNumericProductSegment(segment)) return false
  const canonicalSlug = slug.trim()
  if (!canonicalSlug) return false
  return segment !== canonicalSlug
}
