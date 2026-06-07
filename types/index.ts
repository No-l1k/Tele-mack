// Product Types
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription?: string
  price: number
  oldPrice?: number
  images: string[]
  categoryId: string
  categorySlug: string
  brand: string
  sku?: string
  gtin?: string
  specs: Record<string, string | string[] | number | boolean>
  inStock: boolean
  stockStatus: 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock'
  ratingMode?: 'manual' | 'auto'
  rating: number
  reviewsCount: number
  warrantyMonths?: number
  warrantyType?: string
  serviceInfo?: string
  recommendedAccessoryIds?: string[]
  variantGroup?: string
  variantName?: string
  variantValue?: string
  metaTitle?: string
  metaDescription?: string
  isNew: boolean
  isHit?: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  image: string | null
  description?: string
  parentId?: string
  showOnHome?: boolean
  productCount: number
  order: number
  children?: Category[]
}

// Cart Types
export interface CartItem {
  product: Product
  quantity: number
}

export interface Cart {
  items: CartItem[]
  total: number
  itemsCount: number
}

// Order Types
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'pickup'
export type PaymentStatus = 'pending' | 'paid'
export type DeliveryMethod = 'courier' | 'pickup'

export interface OrderItem {
  productId: string
  productName: string
  productImage: string
  /** Артикул на момент заказа или из карточки товара */
  sku?: string | null
  price: number
  quantity: number
  total: number
}

export interface DeliveryAddress {
  city: string
  street: string
  house: string
  apartment?: string
}

export interface CustomerInfo {
  name: string
  phone: string
  email?: string
}

export interface Order {
  id: string
  number: number
  publicToken?: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  deliveryCost: number
  paymentSurcharge: number
  total: number
  deliveryMethod: DeliveryMethod
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  customer: CustomerInfo
  address?: DeliveryAddress
  comment?: string
  services: {
    pixelCheck: boolean
    installation: boolean
  }
  selectedServices?: Array<{
    id: string
    name: string
    price: number
  }>
  servicesTotal?: number
  createdAt: string
  updatedAt: string
}

// User Types
export type UserRole = 'customer' | 'admin'

export interface User {
  id: string
  phone: string
  email?: string
  name: string
  role: UserRole
  favorites: string[]
  createdAt: string
}

// Review Types
export interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  text: string
  pros?: string
  cons?: string
  approved: boolean
  createdAt: string
}

// Filter Types
export interface ProductFilters {
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  brands?: string[]
  inStock?: boolean
  isNew?: boolean
  search?: string
  sortBy?: 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'popular'
  /** Имя характеристики → выбранные значения (для шаблонных фильтров категории). */
  specFilters?: Record<string, string[]>
}

export type SpecFacets = Record<string, string[]>

// API Response Types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Form Types
export interface OrderUpdateData {
  items: Array<{ productId: string; quantity: number; price?: number }>
  phone: string
  name: string
  email?: string
  city?: string
  street?: string
  house?: string
  apartment?: string
  comment?: string
  deliveryMethod: DeliveryMethod
  paymentMethod: PaymentMethod
  serviceIds?: string[]
  pixelCheck?: boolean
  installation?: boolean
}

export interface CheckoutFormData {
  phone: string
  name: string
  email?: string
  city: string
  street: string
  house: string
  apartment?: string
  comment?: string
  deliveryMethod: DeliveryMethod
  paymentMethod: PaymentMethod
  serviceIds?: string[]
  pixelCheck: boolean
  installation: boolean
  becomeCustomer: boolean
}

export interface RegisterFormData {
  phone: string
  name: string
  email?: string
}

// Stats Types (for admin)
export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  totalProducts: number
  totalUsers: number
  ordersToday: number
  revenueToday: number
}
