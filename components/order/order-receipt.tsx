import type { Order } from '@/types'
import type { StoreSettings } from '@/lib/api'
import { siteConfig } from '@/lib/site'
import { formatDate, formatPaymentMethod } from '@/lib/formatters'
import { formatReceiptRub } from '@/lib/receipt-money'
import styles from './order-receipt.module.css'

type StoreLines = Pick<StoreSettings, 'name' | 'phone' | 'email'>

/** Домен в шапке чека (фиксированный боевой сайт). */
export const RECEIPT_SITE_DISPLAY = 'tele-makc.ru'

function formatAddress(order: Order): string {
  if (!order.address) {
    return order.deliveryMethod === 'pickup' ? 'Самовывоз' : '—'
  }
  const { city, street, house, apartment } = order.address
  const apt = apartment ? `, кв. ${apartment}` : ''
  return `г ${city}, ${street}, д. ${house}${apt}`
}

function deliveryNotes(order: Order, settings: StoreSettings | null): string {
  const lines: string[] = []
  if (order.deliveryMethod === 'courier') {
    lines.push(
      'Доставка по Москве и МО — согласно условиям магазина. За МКАД — доплата 50 руб./км.'
    )
    if (settings?.deliveryInfo?.deliveryDays) {
      lines.push(settings.deliveryInfo.deliveryDays)
    }
  } else {
    lines.push('Самовывоз по адресу магазина или согласованному пункту выдачи.')
  }
  if (settings?.address) {
    lines.push(`Адрес и график: ${settings.address}`)
  }
  return lines.join(' ')
}

function CashIcon() {
  return (
    <span style={{ fontSize: '14px', lineHeight: 1 }} aria-hidden>
      💵
    </span>
  )
}

function TruckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="inline-block shrink-0">
      <path
        d="M3 17h2v-8H3v8zm3 0h8v-8H6v8zm10 0h2v-5h-4v3h2v2zm-9-11h8V6H6v1zm-3 8h2V9H3v6zm14-6v6h2l3 3v4h-4v-3h-2v-6h1z"
        fill="currentColor"
      />
    </svg>
  )
}

export interface OrderReceiptProps {
  order: Order
  store: StoreLines
  settings?: StoreSettings | null
}

export function OrderReceipt({ order, store, settings }: OrderReceiptProps) {
  /** Поставщик и бейдж: из конфига сайта (TeleMakc), не из поля названия в админке — там мог остаться старый текст. */
  const supplierName = siteConfig.name

  const formatSku = (sku: string | null | undefined) => {
    const s = typeof sku === 'string' ? sku.trim() : ''
    return s.length > 0 ? s : '—'
  }

  const productRows = order.items.map((item, i) => ({ item, num: i + 1 }))
  const serviceRows = (order.selectedServices ?? []).map((service, index) => ({
    service,
    num: productRows.length + index + 1,
  }))
  const showSurcharge = order.paymentSurcharge > 0
  const surchargeNum = showSurcharge ? productRows.length + serviceRows.length + 1 : null

  return (
    <article className={styles.sheet}>
      <header>
        <div className={styles.topContacts}>
          {store.phone ? <p>Телефон: {store.phone}</p> : null}
          {store.email ? <p>Почта: {store.email}</p> : null}
        </div>

        <div className={styles.headerCenter}>
          <h1 className={styles.title}>
            Товарный чек №{order.number} от {formatDate(order.createdAt)}
          </h1>
          <p className={styles.siteLine}>{RECEIPT_SITE_DISPLAY}</p>
        </div>
      </header>

      <section className={styles.metaGrid} aria-label="Реквизиты заказа">
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Поставщик:</span>
          <span>{supplierName}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Покупатель:</span>
          <span>{order.customer.name}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Телефон:</span>
          <span>{order.customer.phone}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Способ оплаты:</span>
          <span className={styles.paymentRow}>
            <CashIcon />
            <span>{formatPaymentMethod(order.paymentMethod)}</span>
          </span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Адрес доставки:</span>
          <span>{formatAddress(order)}</span>
        </div>
      </section>

      <div className={styles.logoWrap}>
        <span className={styles.logoBadge}>{supplierName}</span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colNum}>№</th>
              <th className={styles.colSku}>Артикул</th>
              <th className={styles.colProduct}>Товар</th>
              <th className={styles.colUnit}>Ед.</th>
              <th className={styles.colPrice}>Цена</th>
              <th className={styles.colQty}>Кол-во</th>
              <th className={styles.colSum}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {productRows.map(({ item, num }) => (
              <tr key={`${item.productId}-${num}`}>
                <td className={styles.colNum}>{num}</td>
                <td className={styles.colSku}>{formatSku(item.sku)}</td>
                <td className={styles.colProduct}>{item.productName}</td>
                <td className={styles.colUnit}>шт.</td>
                <td className={styles.colPrice}>{formatReceiptRub(item.price)}</td>
                <td className={styles.colQty}>{item.quantity}</td>
                <td className={styles.colSum}>{formatReceiptRub(item.total)}</td>
              </tr>
            ))}
            {serviceRows.map(({ service, num }) => (
              <tr key={service.id}>
                <td className={styles.colNum}>{num}</td>
                <td className={styles.colSku}>—</td>
                <td className={styles.colProduct}>{service.name}</td>
                <td className={styles.colUnit}>шт.</td>
                <td className={styles.colPrice}>{formatReceiptRub(service.price)}</td>
                <td className={styles.colQty}>1</td>
                <td className={styles.colSum}>{formatReceiptRub(service.price)}</td>
              </tr>
            ))}
            {showSurcharge && surchargeNum !== null ? (
              <tr>
                <td className={styles.colNum}>{surchargeNum}</td>
                <td className={styles.colSku}>—</td>
                <td className={styles.colProduct}>Наценка за способ оплаты</td>
                <td className={styles.colUnit}>—</td>
                <td className={styles.colPrice}>—</td>
                <td className={styles.colQty}>—</td>
                <td className={styles.colSum}>{formatReceiptRub(order.paymentSurcharge)}</td>
              </tr>
            ) : null}
            <tr>
              <td className={styles.deliveryCell} colSpan={4}>
                <span className={styles.deliveryIcon}>
                  <TruckIcon />
                  <span>
                    <strong>Доставка.</strong> {deliveryNotes(order, settings ?? null)}
                  </span>
                </span>
              </td>
              <td className={styles.colPrice} />
              <td className={styles.colQty} />
              <td className={styles.colSum}>{formatReceiptRub(order.deliveryCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.totalRow}>Итого: {formatReceiptRub(order.total)}</div>

      <footer className={styles.legal}>
        <p>
          При получении товара Вам необходимо проверить его внешний вид, комплектность, отсутствие механических
          повреждений.
          <br />
          После приемки товара претензии по комплектности и наличию механических повреждений не принимаются.
        </p>
        <p>
          Товар проверен. Претензий к внешнему виду не имею. С условиями работы интернетмагазина ознакомлен(а) и
          согласен(а).
        </p>
      </footer>

      <div className={styles.signatures}>
        <div>
          <div className={styles.sigLine} />
          <div className={styles.sigLabel}>Поставщик</div>
        </div>
        <div>
          <div className={styles.sigLine} />
          <div className={styles.sigLabel}>Покупатель</div>
        </div>
      </div>
    </article>
  )
}
