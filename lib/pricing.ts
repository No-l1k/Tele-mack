export const COURIER_DELIVERY_COST = 1000
export const CARD_SURCHARGE_RATE = 0.15
export const PIXEL_CHECK_COST = 1500
export const INSTALLATION_COST = 3000

export function calculateDeliveryCost(_subtotal: number, deliveryMethod: 'courier' | 'pickup') {
  if (deliveryMethod !== 'courier') return 0
  return COURIER_DELIVERY_COST
}
