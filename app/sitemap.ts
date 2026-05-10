import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

type ApiEnvelope<T> = { data: T }
type Category = { slug: string }
type Product = { slug: string; createdAt?: string }

export const dynamic = 'force-dynamic'

function resolveApiBaseUrl(baseUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_API_URL || '/api'
  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '')
  }
  const normalizedPath = configured.startsWith('/') ? configured : `/${configured}`
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`
}

async function fetchApiData<T>(apiBaseUrl: string, endpoint: string, fallback: T): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    })
    if (!response.ok) return fallback
    const json = (await response.json()) as ApiEnvelope<T>
    return json.data ?? fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/+$/, '')
  const apiBaseUrl = resolveApiBaseUrl(baseUrl)

  const [categories, products] = await Promise.all([
    fetchApiData<Category[]>(apiBaseUrl, '/categories', []),
    fetchApiData<Product[]>(apiBaseUrl, '/products?page=1&page_size=1000', []),
  ])

  // Static pages
  const staticPages = [
    '',
    '/catalog',
    '/catalog/new',
    '/cart',
    '/checkout',
    '/account',
    '/account/orders',
    '/account/favorites',
    '/delivery',
    '/services',
    '/contacts',
    '/warranty',
    '/privacy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  const categoryPages = categories.map((category) => ({
    url: `${baseUrl}/catalog/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  const productPages = products.map((product) => ({
    url: `${baseUrl}/product/${product.slug}`,
    lastModified: product.createdAt ? new Date(product.createdAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}
