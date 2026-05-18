/**
 * API Service Layer
 * 
 * Этот файл содержит все API вызовы для интеграции с Python бэкендом.
 * База для запросов задаётся через getApiBaseUrl() (на сервере — API_URL_INTERNAL).
 * 
 * Все методы возвращают Promise и обрабатывают ошибки единообразно.
 */

import type {
  Product,
  Category,
  Order,
  User,
  Review,
  ProductFilters,
  CheckoutFormData,
  PaginatedResponse,
  ApiResponse,
  DashboardStats,
  OrderStatus,
} from '@/types'

import { getApiBaseUrl } from '@/lib/api-base-url'

interface ProductWritePayload {
  name: string
  slug: string
  description: string
  shortDescription?: string
  price: number
  oldPrice?: number
  categoryId: number
  categorySlug: string
  brand: string
  sku?: string
  gtin?: string
  specs: Record<string, string | string[] | number | boolean>
  inStock: boolean
  stockStatus: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock'
  quantity: number
  isNew: boolean
  ratingMode?: 'manual' | 'auto'
  rating?: number
  reviewsCount?: number
  warrantyMonths?: number
  warrantyType?: string
  serviceInfo?: string
  recommendedAccessoryIds?: number[]
  metaTitle?: string
  metaDescription?: string
  images: string[]
}

type CategoryCreatePayload = Omit<Category, 'id' | 'productCount' | 'children' | 'parentId'> & {
  parentId?: number
}

type CategoryUpdatePayload = Partial<Omit<Category, 'children' | 'parentId'>> & {
  parentId?: number | null
}

function formatApiErrorBody(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Ошибка сервера'
  const record = body as Record<string, unknown>
  if (typeof record.message === 'string') return record.message
  if (typeof record.detail === 'string') return record.detail
  if (Array.isArray(record.detail)) {
    return record.detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg?: string }).msg ?? item)
        }
        return String(item)
      })
      .join('; ')
  }
  return 'Ошибка сервера'
}

// ============================================
// Базовые функции для HTTP запросов
// ============================================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Добавляем токен авторизации если есть
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null
  
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    }
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(formatApiErrorBody(body) || `HTTP ${response.status}`)
  }

  return response.json()
}

// ============================================
// PRODUCTS API
// ============================================

export const productsApi = {
  /**
   * GET /products - Получить список товаров с фильтрацией
   */
  getAll: (filters?: ProductFilters, page = 1, pageSize = 20): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams()
    if (filters?.categorySlug) params.set('category', filters.categorySlug)
    if (filters?.minPrice) params.set('min_price', String(filters.minPrice))
    if (filters?.maxPrice) params.set('max_price', String(filters.maxPrice))
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
    
    return fetchApi(`/products?${params.toString()}`)
  },

  /**
   * GET /products/:id - Получить товар по ID
   */
  getById: (id: string): Promise<ApiResponse<Product>> => {
    return fetchApi(`/products/${id}`)
  },

  /**
   * GET /products/slug/:slug - Получить товар по slug
   */
  getBySlug: (slug: string): Promise<ApiResponse<Product>> => {
    return fetchApi(`/products/slug/${slug}`)
  },

  /**
   * POST /products - Создать товар (admin)
   */
  create: (data: ProductWritePayload): Promise<ApiResponse<Product>> => {
    return fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PUT /products/:id - Обновить товар (admin)
   */
  update: (id: string, data: Partial<ProductWritePayload>): Promise<ApiResponse<Product>> => {
    return fetchApi(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * DELETE /products/:id - Удалить товар (admin)
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return fetchApi(`/products/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * POST /products/:id/images - Загрузить изображения товара (admin)
   */
  uploadImages: async (id: string, files: File[]): Promise<ApiResponse<string[]>> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const response = await fetch(`${getApiBaseUrl()}/products/${id}/images`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(formatApiErrorBody(body) || `HTTP ${response.status}`)
    }
    return body as ApiResponse<string[]>
  },

  /**
   * PUT /products/:id/images/order — порядок фото (первый = главный)
   */
  reorderImages: (id: string, images: string[]): Promise<ApiResponse<Product>> => {
    return fetchApi(`/products/${id}/images/order`, {
      method: 'PUT',
      body: JSON.stringify({ images }),
    })
  },

  /**
   * DELETE /products/:id/images — удалить одно фото (url в теле)
   */
  deleteImage: (id: string, url: string): Promise<ApiResponse<Product>> => {
    return fetchApi(`/products/${id}/images`, {
      method: 'DELETE',
      body: JSON.stringify({ url }),
    })
  },

  /**
   * GET /products/search - Поиск товаров
   */
  search: (query: string): Promise<PaginatedResponse<Product>> => {
    return fetchApi(`/products/search?q=${encodeURIComponent(query)}`)
  },

  /**
   * GET /products/new - Новинки
   */
  getNew: (limit = 10): Promise<ApiResponse<Product[]>> => {
    return fetchApi(`/products/new?limit=${limit}`)
  },

  /**
   * GET /products/popular - Популярные товары
   */
  getPopular: (limit = 10): Promise<ApiResponse<Product[]>> => {
    return fetchApi(`/products/popular?limit=${limit}`)
  },

  /**
   * GET /products/brands - Список брендов
   */
  getBrands: (limit = 24): Promise<ApiResponse<string[]>> => {
    return fetchApi(`/products/brands?limit=${limit}`)
  },

  /**
   * GET /products/:id/related - Похожие товары
   */
  getRelated: (id: string, limit = 4): Promise<ApiResponse<Product[]>> => {
    return fetchApi(`/products/${id}/related?limit=${limit}`)
  },

  /**
   * GET /products/export - Экспорт товаров в CSV (admin)
   */
  export: (): Promise<Blob> => {
    return fetch(`${getApiBaseUrl()}/products/export`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }).then((res) => res.blob())
  },
}

// ============================================
// CATEGORIES API
// ============================================

export const categoriesApi = {
  /**
   * GET /categories - Получить все категории
   */
  getAll: (): Promise<ApiResponse<Category[]>> => {
    return fetchApi('/categories')
  },

  getTree: (): Promise<ApiResponse<Category[]>> => {
    return fetchApi('/categories/tree')
  },

  /**
   * GET /categories/:id - Получить категорию по ID
   */
  getById: (id: string): Promise<ApiResponse<Category>> => {
    return fetchApi(`/categories/${id}`)
  },

  /**
   * GET /categories/slug/:slug - Получить категорию по slug
   */
  getBySlug: (slug: string): Promise<ApiResponse<Category>> => {
    return fetchApi(`/categories/slug/${slug}`)
  },

  /**
   * POST /categories - Создать категорию (admin)
   */
  create: (data: CategoryCreatePayload): Promise<ApiResponse<Category>> => {
    return fetchApi('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PUT /categories/:id - Обновить категорию (admin)
   */
  update: (id: string, data: CategoryUpdatePayload): Promise<ApiResponse<Category>> => {
    return fetchApi(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * DELETE /categories/:id - Удалить категорию (admin)
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return fetchApi(`/categories/${id}`, {
      method: 'DELETE',
    })
  },

  uploadImage: async (id: string, image: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData()
    formData.append('image', image)
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const response = await fetch(`${getApiBaseUrl()}/categories/${id}/image`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(formatApiErrorBody(body) || `HTTP ${response.status}`)
    }
    return body as ApiResponse<Category>
  },
}

// ============================================
// ORDERS API
// ============================================

export const ordersApi = {
  /**
   * GET /orders - Получить все заказы (admin) или заказы пользователя
   */
  getAll: (params?: {
    status?: OrderStatus
    page?: number
    pageSize?: number
    userId?: string
  }): Promise<PaginatedResponse<Order>> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('page_size', String(params.pageSize))
    if (params?.userId) searchParams.set('user_id', params.userId)
    
    return fetchApi(`/orders?${searchParams.toString()}`)
  },

  /**
   * GET /orders/:id - Получить заказ по ID
   */
  getById: (id: string): Promise<ApiResponse<Order>> => {
    return fetchApi(`/orders/${id}`)
  },

  /**
   * GET /orders/public/:id - Получить заказ для страницы подтверждения
   */
  getPublicById: (id: string, token: string): Promise<ApiResponse<Order>> => {
    return fetchApi(`/orders/public/${id}?token=${encodeURIComponent(token)}`)
  },

  lookupPublicAccess: (orderNumber: number, phone: string): Promise<ApiResponse<{
    orderId: number
    orderNumber: number
    publicToken: string
    createdAt: string
    status: string
  }>> => {
    return fetchApi('/orders/public/lookup', {
      method: 'POST',
      body: JSON.stringify({ orderNumber, phone }),
    })
  },

  /**
   * POST /orders - Создать заказ
   */
  create: (data: CheckoutFormData & { items: Array<{ productId: string; quantity: number }> }): Promise<ApiResponse<Order>> => {
    return fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PUT /orders/:id/status - Обновить статус заказа (admin)
   */
  updateStatus: (id: string, status: OrderStatus): Promise<ApiResponse<Order>> => {
    return fetchApi(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  /**
   * PUT /orders/:id/payment - Отметить заказ как оплаченный (admin)
   */
  markAsPaid: (id: string): Promise<ApiResponse<Order>> => {
    return fetchApi(`/orders/${id}/payment`, {
      method: 'PUT',
      body: JSON.stringify({ paid: true }),
    })
  },

  /**
   * GET /orders/stats - Статистика по заказам (admin)
   */
  getStats: (period?: 'today' | 'week' | 'month' | 'year'): Promise<ApiResponse<{
    total: number
    revenue: number
    byStatus: Record<OrderStatus, number>
  }>> => {
    const params = period ? `?period=${period}` : ''
    return fetchApi(`/orders/stats${params}`)
  },

  /**
   * GET /orders/export - Экспорт заказов в CSV (admin)
   */
  export: (params?: { status?: OrderStatus; from?: string; to?: string }): Promise<Blob> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    
    return fetch(`${getApiBaseUrl()}/orders/export?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }).then(res => res.blob())
  },
}

// ============================================
// USERS API
// ============================================

export const usersApi = {
  /**
   * GET /users - Получить всех пользователей (admin)
   */
  getAll: (page = 1, pageSize = 20): Promise<PaginatedResponse<User>> => {
    return fetchApi(`/users?page=${page}&page_size=${pageSize}`)
  },

  /**
   * GET /users/:id - Получить пользователя по ID
   */
  getById: (id: string): Promise<ApiResponse<User>> => {
    return fetchApi(`/users/${id}`)
  },

  /**
   * GET /users/me - Получить текущего пользователя
   */
  getMe: (): Promise<ApiResponse<User>> => {
    return fetchApi('/users/me')
  },

  /**
   * PUT /users/me - Обновить профиль текущего пользователя
   */
  updateProfile: (data: { name?: string; email?: string }): Promise<ApiResponse<User>> => {
    return fetchApi('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * GET /users/me/orders - Получить заказы текущего пользователя
   */
  getMyOrders: (page = 1): Promise<PaginatedResponse<Order>> => {
    return fetchApi(`/users/me/orders?page=${page}`)
  },

  /**
   * POST /users/me/favorites/:productId - Добавить в избранное
   */
  addToFavorites: (productId: string): Promise<ApiResponse<void>> => {
    return fetchApi(`/users/me/favorites/${productId}`, {
      method: 'POST',
    })
  },

  /**
   * DELETE /users/me/favorites/:productId - Удалить из избранного
   */
  removeFromFavorites: (productId: string): Promise<ApiResponse<void>> => {
    return fetchApi(`/users/me/favorites/${productId}`, {
      method: 'DELETE',
    })
  },

  /**
   * GET /users/me/favorites - Получить избранные товары
   */
  getFavorites: (): Promise<ApiResponse<Product[]>> => {
    return fetchApi('/users/me/favorites')
  },
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
  /**
   * POST /auth/login - Авторизация по телефону
   */
  login: (phone: string): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  },

  /**
   * POST /auth/verify - Подтверждение кода из SMS
   */
  verifyCode: (phone: string, code: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    return fetchApi('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    })
  },

  /**
   * POST /auth/register - Регистрация нового пользователя
   */
  register: (data: { phone: string; name: string; email?: string }): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * POST /auth/logout - Выход
   */
  logout: (): Promise<ApiResponse<void>> => {
    return fetchApi('/auth/logout', {
      method: 'POST',
    })
  },

  /**
   * POST /auth/admin/login - Вход в админку (логин + пароль)
   */
  adminLogin: (login: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    return fetchApi('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    })
  },
}

// ============================================
// REVIEWS API
// ============================================

export const reviewsApi = {
  /**
   * GET /reviews - Получить все отзывы (admin)
   */
  getAll: (params?: {
    approved?: boolean
    productId?: string
    page?: number
  }): Promise<PaginatedResponse<Review>> => {
    const searchParams = new URLSearchParams()
    if (params?.approved !== undefined) searchParams.set('approved', String(params.approved))
    if (params?.productId) searchParams.set('product_id', params.productId)
    if (params?.page) searchParams.set('page', String(params.page))
    
    return fetchApi(`/reviews?${searchParams.toString()}`)
  },

  /**
   * GET /products/:id/reviews - Получить отзывы товара
   */
  getByProduct: (productId: string, page = 1): Promise<PaginatedResponse<Review>> => {
    return fetchApi(`/products/${productId}/reviews?page=${page}`)
  },

  /**
   * POST /products/:id/reviews - Создать отзыв
   */
  create: (productId: string, data: {
    rating: number
    text: string
    pros?: string
    cons?: string
  }): Promise<ApiResponse<Review>> => {
    return fetchApi(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PUT /reviews/:id/approve - Одобрить отзыв (admin)
   */
  approve: (id: string): Promise<ApiResponse<Review>> => {
    return fetchApi(`/reviews/${id}/approve`, {
      method: 'PUT',
    })
  },

  /**
   * DELETE /reviews/:id - Удалить отзыв (admin)
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return fetchApi(`/reviews/${id}`, {
      method: 'DELETE',
    })
  },
}

// ============================================
// DASHBOARD API (Admin)
// ============================================

export const dashboardApi = {
  /**
   * GET /admin/stats - Получить статистику для дашборда
   */
  getStats: (): Promise<ApiResponse<DashboardStats>> => {
    return fetchApi('/admin/stats')
  },

  /**
   * GET /admin/analytics - Получить аналитику за период
   */
  getAnalytics: (period: 'week' | 'month' | 'year'): Promise<ApiResponse<{
    revenue: { date: string; amount: number }[]
    orders: { date: string; count: number }[]
    topProducts: { product: Product; soldCount: number }[]
    topCategories: { category: Category; revenue: number }[]
  }>> => {
    return fetchApi(`/admin/analytics?period=${period}`)
  },
}

// ============================================
// SETTINGS API (Admin)
// ============================================

export interface StoreSettings {
  name: string
  phone: string
  email: string
  address: string
  workingHours: string
  deliveryInfo: {
    moscowFree: boolean
    moscowMinSum: number
    regionCostPerKm: number
    deliveryDays: string
  }
  paymentMethods: {
    cash: boolean
    card: boolean
    cardSurcharge: number
    pickup: boolean
  }
  social: {
    whatsapp?: string
    telegram?: string
    viber?: string
  }
  heroBanners?: HeroBanner[]
  checkoutServices?: CheckoutService[]
}

export interface HeroBanner {
  image: string
  href?: string
}

export interface CheckoutService {
  id: string
  name: string
  price: number
  description?: string | null
  enabled: boolean
  sortOrder: number
}

export const settingsApi = {
  /**
   * GET /admin/settings - Получить настройки магазина
   */
  get: (): Promise<ApiResponse<StoreSettings>> => {
    return fetchApi('/admin/settings')
  },

  /**
   * PUT /admin/settings - Обновить настройки магазина
   */
  update: (data: Partial<StoreSettings>): Promise<ApiResponse<StoreSettings>> => {
    return fetchApi('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  uploadHeroImages: async (files: File[]): Promise<ApiResponse<HeroBanner[]>> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const response = await fetch(`${getApiBaseUrl()}/admin/settings/hero-images`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(formatApiErrorBody(body) || `HTTP ${response.status}`)
    }
    return body as ApiResponse<HeroBanner[]>
  },

  deleteHeroImage: async (url: string): Promise<ApiResponse<HeroBanner[]>> => {
    const encoded = encodeURIComponent(url)
    return fetchApi(`/admin/settings/hero-images?url=${encoded}`, {
      method: 'DELETE',
    })
  },
}

export const publicSettingsApi = {
  /**
   * GET /public/settings - Публичные настройки витрины
   */
  get: (): Promise<ApiResponse<StoreSettings>> => {
    return fetchApi('/public/settings')
  },

  sendContactRequest: (data: {
    name: string
    phone: string
    email?: string
    subject?: string
    message: string
  }): Promise<ApiResponse<void>> => {
    return fetchApi('/public/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  sendQuickOrder: (data: {
    productId: string
    name: string
    phone: string
    comment?: string
    quantity?: number
  }): Promise<ApiResponse<{ orderId: number; number: number }>> => {
    return fetchApi('/public/quick-order', {
      method: 'POST',
      body: JSON.stringify({
        productId: Number(data.productId),
        name: data.name,
        phone: data.phone,
        comment: data.comment,
        quantity: data.quantity ?? 1,
      }),
    })
  },
}

// ============================================
// EXPORT для удобства
// ============================================

export const api = {
  products: productsApi,
  categories: categoriesApi,
  orders: ordersApi,
  users: usersApi,
  auth: authApi,
  reviews: reviewsApi,
  dashboard: dashboardApi,
  settings: settingsApi,
  publicSettings: publicSettingsApi,
}

export default api
