/** Адрес пункта самовывоза (страница «Доставка и оплата», форма заказа). */
export const PICKUP_ADDRESS = 'г. Москва, ул. Прасковьина, 21'

/** Минимальная сумма заказа (руб.), если в настройках магазина не указано иное (deliveryInfo.moscowMinSum). */
export const DEFAULT_MIN_ORDER_AMOUNT_RUB = 4000

/** Значение moscowMinSum=1 в старых настройках — не реальный минимум, а устаревший дефолт. */
export const LEGACY_MIN_ORDER_AMOUNT_RUB = 1

/** Единая логика с backend/app/services/store_settings.py */
export function resolveMinOrderAmountRub(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') {
    return DEFAULT_MIN_ORDER_AMOUNT_RUB
  }
  const value = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
  if (!Number.isFinite(value) || value <= 0 || value === LEGACY_MIN_ORDER_AMOUNT_RUB) {
    return DEFAULT_MIN_ORDER_AMOUNT_RUB
  }
  return value
}
