import type { ProductSeoInput } from '@/lib/product-seo'

export function readProductSeoFromForm(
  formId: string,
  fallback: ProductSeoInput
): ProductSeoInput {
  if (typeof document === 'undefined') return fallback
  const form = document.getElementById(formId) as HTMLFormElement | null
  if (!form) return fallback

  const fd = new FormData(form)
  const name = String(fd.get('name') ?? '').trim() || fallback.name
  const slug = String(fd.get('slug') ?? '').trim() || fallback.slug
  const priceRaw = Number(fd.get('price'))
  const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : fallback.price
  const brand = String(fd.get('brand') ?? '').trim() || fallback.brand

  return {
    ...fallback,
    name,
    slug,
    price,
    brand,
  }
}
