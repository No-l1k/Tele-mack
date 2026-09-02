import { formatPaymentMethod } from '@/lib/formatters'
import { siteConfig } from '@/lib/site'
import type { Order, ReceiptLineItem, ReceiptSnapshot } from '@/types'

export function formatOrderDeliveryAddress(order: Order): string {
  if (!order.address) {
    return order.deliveryMethod === 'pickup' ? 'Самовывоз' : '—'
  }
  const { city, street, house, apartment } = order.address
  const apt = apartment ? `, кв. ${apartment}` : ''
  return `${city}, ${street}, д. ${house}${apt}`
}

function defaultDeliveryNote(order: Order): string {
  if (order.deliveryMethod === 'courier') {
    return 'Доставка по Москве и МО — согласно условиям магазина. За МКАД — доплата 70 руб./км.'
  }
  return 'Самовывоз по адресу магазина или согласованному пункту выдачи.'
}

export function buildReceiptRowsFromOrder(order: Order): ReceiptLineItem[] {
  const productRows: ReceiptLineItem[] = order.items.map((item) => ({
    sku: (item.sku ?? '').trim(),
    productName: item.productName,
    unit: 'шт.',
    price: item.price,
    quantity: item.quantity,
    total: item.total,
  }))
  const serviceRows: ReceiptLineItem[] = (order.selectedServices ?? []).map((service) => ({
    sku: '',
    productName: service.name,
    unit: 'шт.',
    price: service.price,
    quantity: 1,
    total: service.price,
  }))
  return [...productRows, ...serviceRows]
}

export function buildReceiptSnapshotFromOrder(
  order: Order,
  supplierName: string = siteConfig.name,
): ReceiptSnapshot {
  const rows = buildReceiptRowsFromOrder(order)
  const rowsTotal = rows.reduce((sum, row) => sum + row.total, 0)
  const surcharge = order.paymentSurcharge > 0 ? order.paymentSurcharge : 0

  return {
    supplier: supplierName,
    buyer: order.customer.name,
    phone: order.customer.phone,
    paymentMethodText: formatPaymentMethod(order.paymentMethod),
    deliveryAddress: formatOrderDeliveryAddress(order),
    comment: order.comment?.trim() || null,
    rows,
    deliveryCost: order.deliveryCost,
    deliveryNote: defaultDeliveryNote(order),
    paymentSurcharge: surcharge,
    total: order.total || rowsTotal + order.deliveryCost + surcharge,
  }
}

export function computeReceiptTotal(snapshot: Pick<ReceiptSnapshot, 'rows' | 'deliveryCost' | 'paymentSurcharge'>): number {
  const rowsTotal = snapshot.rows.reduce((sum, row) => sum + (row.total || 0), 0)
  return rowsTotal + snapshot.deliveryCost + snapshot.paymentSurcharge
}

export function computeRowTotal(price: number, quantity: number): number {
  return Math.max(0, Math.round(price) * Math.max(1, quantity))
}
