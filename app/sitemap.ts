import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'
import { getApiBaseUrl } from '@/lib/api-base-url'

type ApiEnvelope<T> = { data: T }
type Category = { slug: string }
type Product = { slug: string; createdAt?: string }
type PaginatedProducts = {
  data: Product[]
  totalPages?: number
  page?: number
}

export const dynamic = 'force-dynamic'

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

const EMPTY_PRODUCTS_PAGE: PaginatedProducts = { data: [], totalPages: 1, page: 1 }

/** /products отдаёт пагинацию в корне JSON, не в обёртке ApiResponse — читаем ответ целиком. */
async function fetchProductsPage(
  apiBaseUrl: string,
  page: number,
  pageSize: number,
): Promise<PaginatedProducts> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(
      `${apiBaseUrl}/products?page=${page}&page_size=${pageSize}`,
      { signal: controller.signal, next: { revalidate: 3600 } },
    )
    if (!response.ok) return EMPTY_PRODUCTS_PAGE
    return (await response.json()) as PaginatedProducts
  } catch {
    return EMPTY_PRODUCTS_PAGE
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchAllProducts(apiBaseUrl: string): Promise<Product[]> {
  const pageSize = 100
  let page = 1
  let totalPages = 1
  const result: Product[] = []

  while (page <= totalPages) {
    const response = await fetchProductsPage(apiBaseUrl, page, pageSize)
    result.push(...(response.data ?? []))
    totalPages = Math.max(1, Number(response.totalPages || 1))
    page += 1
  }

  return result
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/+$/, '')
  const apiBaseUrl = getApiBaseUrl()

  const [categories, products] = await Promise.all([
    fetchApiData<Category[]>(apiBaseUrl, '/categories', []),
    fetchAllProducts(apiBaseUrl),
  ])

  // Static pages
  const staticPages = [
    '',
    '/catalog',
    '/catalog/new',
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
