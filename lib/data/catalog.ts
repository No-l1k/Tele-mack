import type { Category, Product, ProductFilters } from '@/types'
import { getApiBaseUrl } from '@/lib/api-base-url'

type ApiEnvelope<T> = {
  data: T
}

type PaginatedApiResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ProductFiltersMeta = {
  brands: string[]
  priceRange: PriceRange
  specFacets?: Record<string, string[]>
}

export type PriceRange = {
  min: number
  max: number
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    id: String(product.id),
    categoryId: String(product.categoryId),
    recommendedAccessoryIds: (product.recommendedAccessoryIds ?? []).map((id) => String(id)),
    images: product.images?.length ? product.images : ['/placeholder.svg'],
  }
}

function normalizeCategory(category: Category): Category {
  return {
    ...category,
    id: String(category.id),
    parentId: category.parentId ? String(category.parentId) : undefined,
  }
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return response.json()
}

function toProductQuery(filters?: ProductFilters, page = 1, pageSize = 20) {
  const params = new URLSearchParams()
  if (filters?.categorySlug) params.set('category', filters.categorySlug)
  if (filters?.minPrice !== undefined) params.set('min_price', String(filters.minPrice))
  if (filters?.maxPrice !== undefined) params.set('max_price', String(filters.maxPrice))
  if (filters?.brands?.length) params.set('brands', filters.brands.join(','))
  if (filters?.inStock !== undefined) params.set('in_stock', String(filters.inStock))
  if (filters?.isNew) params.set('is_new', 'true')
  if (filters?.search) params.set('search', filters.search)
  if (filters?.sortBy) params.set('sort', filters.sortBy)
  if (filters?.specFilters && Object.keys(filters.specFilters).length > 0) {
    params.set('spec_filters', JSON.stringify(filters.specFilters))
  }
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  return params.toString()
}

export async function getCategories(): Promise<Category[]> {
  const response = await apiGet<ApiEnvelope<Category[]>>('/categories')
  return response.data.map(normalizeCategory)
}

export async function getCategoryTree(): Promise<Category[]> {
  const response = await apiGet<ApiEnvelope<Category[]>>('/categories/tree')
  const normalize = (category: Category): Category => ({
    ...normalizeCategory(category),
    children: (category.children ?? []).map(normalize),
  })
  return response.data.map(normalize)
}

export async function getProducts(filters?: ProductFilters, page = 1, pageSize = 100): Promise<Product[]> {
  const query = toProductQuery(filters, page, pageSize)
  const response = await apiGet<PaginatedApiResponse<Product>>(`/products?${query}`)
  return response.data.map(normalizeProduct)
}

export async function getProductsPage(filters?: ProductFilters, page = 1, pageSize = 20): Promise<PaginatedApiResponse<Product>> {
  const query = toProductQuery(filters, page, pageSize)
  const response = await apiGet<PaginatedApiResponse<Product>>(`/products?${query}`)
  return {
    ...response,
    data: response.data.map(normalizeProduct),
  }
}

export async function getProductFiltersMeta(
  filters?: Pick<ProductFilters, 'categorySlug' | 'inStock' | 'isNew' | 'search' | 'specFilters'>,
): Promise<ProductFiltersMeta> {
  const params = new URLSearchParams()
  if (filters?.categorySlug) params.set('category', filters.categorySlug)
  if (filters?.inStock !== undefined) params.set('in_stock', String(filters.inStock))
  if (filters?.isNew !== undefined) params.set('is_new', String(filters.isNew))
  if (filters?.search) params.set('search', filters.search)
  if (filters?.specFilters && Object.keys(filters.specFilters).length > 0) {
    params.set('spec_filters', JSON.stringify(filters.specFilters))
  }
  const query = params.toString()
  const response = await apiGet<ApiEnvelope<ProductFiltersMeta>>(`/products/filters/meta${query ? `?${query}` : ''}`)
  return {
    ...response.data,
    specFacets: response.data.specFacets ?? {},
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  try {
    const response = await apiGet<ApiEnvelope<Category>>(`/categories/slug/${slug}`)
    return normalizeCategory(response.data)
  } catch (error) {
    const status = (error as { status?: number })?.status
    if (status === 404) {
      return undefined
    }
    throw error
  }
}

export async function getProductByIdOrSlug(idOrSlug: string): Promise<Product | undefined> {
  const isNumericSegment = /^\d+$/.test(idOrSlug)
  const endpoints = isNumericSegment
    ? [`/products/${idOrSlug}`, `/products/slug/${idOrSlug}`]
    : [`/products/slug/${idOrSlug}`]

  for (const endpoint of endpoints) {
    try {
      const response = await apiGet<ApiEnvelope<Product>>(endpoint)
      return normalizeProduct(response.data)
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (status !== 404) {
        throw error
      }
    }
  }

  return undefined
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
  const products = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const response = await apiGet<ApiEnvelope<Product>>(`/products/${id}`)
        return normalizeProduct(response.data)
      } catch {
        return null
      }
    }),
  )
  return products.filter((product): product is Product => Boolean(product))
}

export async function getNewProducts(limit = 8): Promise<Product[]> {
  const response = await apiGet<ApiEnvelope<Product[]>>(`/products/new?limit=${limit}`)
  return response.data.map(normalizeProduct)
}

export async function getHitProducts(): Promise<Product[]> {
  const response = await apiGet<ApiEnvelope<Product[]>>('/products/popular?limit=8')
  return response.data.map(normalizeProduct)
}

export async function getProductsByCategory(categorySlug: string, limit?: number): Promise<Product[]> {
  const products = await getProducts({ categorySlug }, 1, limit ?? 100)
  return limit ? products.slice(0, limit) : products
}

export async function searchProducts(query: string): Promise<Product[]> {
  const response = await apiGet<PaginatedApiResponse<Product>>(`/products/search?q=${encodeURIComponent(query)}`)
  return response.data.map(normalizeProduct)
}

export async function getBrands(limit = 24): Promise<string[]> {
  const response = await apiGet<ApiEnvelope<string[]>>(`/products/brands?limit=${limit}`)
  return response.data
}
