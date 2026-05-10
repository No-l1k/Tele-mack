// Format price in Russian rubles
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + ' руб'
}

// Format price without "руб"
export function formatPriceShort(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Format date in Russian locale
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Format phone number
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7(${cleaned.slice(1, 4)})${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
  }
  if (cleaned.length === 10) {
    return `+7(${cleaned.slice(0, 3)})${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 10)}`
  }
  return phone
}

// Calculate discount percentage
export function calculateDiscount(price: number, oldPrice: number): number {
  if (!oldPrice || oldPrice <= price) return 0
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}

// Format order status
export function formatOrderStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Ожидает подтверждения',
    confirmed: 'Подтвержден',
    processing: 'Обрабатывается',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    cancelled: 'Отменен',
  }
  return statuses[status] || status
}

// Get order status color
export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning-foreground border-warning/20',
    confirmed: 'bg-success/10 text-success border-success/20',
    processing: 'bg-primary/10 text-primary border-primary/20',
    shipped: 'bg-blue-50 text-blue-700 border-blue-200',
    delivered: 'bg-success/10 text-success border-success/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  }
  return colors[status] || 'bg-muted text-muted-foreground border-border'
}

// Format payment method
export function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    cash: 'Наличными курьеру при получении',
    card: 'Безналичная оплата (+15%)',
    pickup: 'Оплата в точке самовывоза',
  }
  return methods[method] || method
}

// Format delivery method
export function formatDeliveryMethod(method: string): string {
  const methods: Record<string, string> = {
    courier: 'Курьером',
    pickup: 'Самовывоз',
  }
  return methods[method] || method
}

// Pluralize Russian words
export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod100 >= 11 && mod100 <= 19) {
    return many
  }

  if (mod10 === 1) {
    return one
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }

  return many
}

// Format items count
export function formatItemsCount(count: number): string {
  return `${count} ${pluralize(count, 'товар', 'товара', 'товаров')}`
}

// Format reviews count  
export function formatReviewsCount(count: number): string {
  return `${count} ${pluralize(count, 'отзыв', 'отзыва', 'отзывов')}`
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}
