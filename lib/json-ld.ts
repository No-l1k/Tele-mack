import type { Category, Product } from '@/types'
import { htmlToText } from '@/lib/rich-text'
import { resolveMediaUrl } from '@/lib/media'
import { organizationTelephones } from '@/lib/store-contacts'
import { siteConfig } from '@/lib/site'
import { resolveProductSeoDescription, type ProductSeoInput } from '@/lib/product-seo'

export type JsonLd = Record<string, unknown>

export type BreadcrumbJsonLdItem = {
  label: string
  href?: string
}

function siteOrigin(): string {
  return siteConfig.url.replace(/\/+$/, '')
}

export function absoluteSiteUrl(path: string): string {
  if (!path) return siteOrigin()
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}

function productAvailability(stockStatus: Product['stockStatus'], inStock: boolean): string {
  if (!inStock || stockStatus === 'out_of_stock') {
    return 'https://schema.org/OutOfStock'
  }
  if (stockStatus === 'preorder') {
    return 'https://schema.org/PreOrder'
  }
  return 'https://schema.org/InStock'
}

export function buildOrganizationJsonLd(options?: {
  name?: string
  phone?: string
  email?: string
  address?: string
}): JsonLd {
  const name = options?.name?.trim() || siteConfig.name
  const org: JsonLd = {
    '@type': 'Organization',
    '@id': `${siteOrigin()}/#organization`,
    name,
    url: siteOrigin(),
    logo: absoluteSiteUrl('/android-chrome-192x192.png'),
  }
  const phones = organizationTelephones(options?.phone)
  if (phones.length === 1) {
    org.telephone = phones[0]
  } else if (phones.length > 1) {
    org.telephone = phones
  }
  if (options?.email?.trim()) {
    org.email = options.email.trim()
  }
  if (options?.address?.trim()) {
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: options.address.trim(),
      addressCountry: 'RU',
    }
  }
  return org
}

export function buildWebSiteJsonLd(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': `${siteOrigin()}/#website`,
    name: siteConfig.name,
    url: siteOrigin(),
    publisher: { '@id': `${siteOrigin()}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteOrigin()}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildBreadcrumbListJsonLd(items: BreadcrumbJsonLdItem[]): JsonLd | null {
  const elements = items
    .map((item, index) => {
      const name = item.label?.trim()
      if (!name) return null
      const entry: JsonLd = {
        '@type': 'ListItem',
        position: index + 1,
        name,
      }
      if (item.href) {
        entry.item = absoluteSiteUrl(item.href)
      }
      return entry
    })
    .filter((item): item is JsonLd => Boolean(item))

  if (elements.length === 0) return null

  return {
    '@type': 'BreadcrumbList',
    itemListElement: elements,
  }
}

export function buildProductJsonLd(
  product: Product,
  options?: {
    category?: Category | null
    storeName?: string
    storePhone?: string
  }
): JsonLd[] {
  const storeName = options?.storeName?.trim() || siteConfig.name
  const seoInput: ProductSeoInput = {
    name: product.name,
    slug: product.slug,
    price: product.price,
    brand: product.brand,
    categoryName: options?.category?.name ?? product.categorySlug,
    storeName,
    storePhone: options?.storePhone,
  }

  const description = htmlToText(
    resolveProductSeoDescription(
      seoInput,
      product.metaDescription,
      storeName,
      options?.storePhone
    ) ||
      product.shortDescription ||
      product.description ||
      ''
  )

  const productUrl = absoluteSiteUrl(`/product/${product.slug}`)
  const images = (product.images ?? [])
    .map((image) => resolveMediaUrl(image))
    .filter((url) => url && !url.endsWith('/placeholder.svg'))

  const productSchema: JsonLd = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description: description || undefined,
    url: productUrl,
    sku: product.sku?.trim() || product.id,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'RUB',
      price: String(product.price),
      availability: productAvailability(product.stockStatus, product.inStock),
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  if (images.length > 0) {
    productSchema.image = images.length === 1 ? images[0] : images
  }

  const brandName = product.brand?.trim()
  if (brandName) {
    productSchema.brand = {
      '@type': 'Brand',
      name: brandName,
    }
  }

  if (product.gtin?.trim()) {
    productSchema.gtin = product.gtin.trim()
  }

  const breadcrumbItems: BreadcrumbJsonLdItem[] = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog' },
  ]
  if (options?.category) {
    breadcrumbItems.push({
      label: options.category.name,
      href: `/catalog/${options.category.slug}`,
    })
  }
  breadcrumbItems.push({ label: product.name })

  const breadcrumbSchema = buildBreadcrumbListJsonLd(breadcrumbItems)
  const schemas: JsonLd[] = [productSchema]
  if (breadcrumbSchema) schemas.push(breadcrumbSchema)

  return schemas
}

export function buildProductPageJsonLdGraph(
  product: Product,
  options?: {
    category?: Category | null
    storeName?: string
    storePhone?: string
  }
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': buildProductJsonLd(product, options),
  }
}

export function buildSiteJsonLdGraph(options?: {
  name?: string
  phone?: string
  email?: string
  address?: string
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [buildOrganizationJsonLd(options), buildWebSiteJsonLd()],
  }
}
