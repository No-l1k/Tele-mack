import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OrderReceipt } from '@/components/order/order-receipt'
import { OrderReceiptToolbar } from '@/components/order/order-receipt-toolbar'
import { fetchPublicOrder, fetchPublicSettings } from '@/lib/server-store'
import { siteConfig } from '@/lib/site'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Товарный чек · заказ ${id}`,
    robots: { index: false, follow: false },
  }
}

export default async function OrderPrintPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token } = await searchParams

  if (!token) {
    notFound()
  }

  const [order, settings] = await Promise.all([fetchPublicOrder(id, token), fetchPublicSettings()])

  if (!order) {
    notFound()
  }

  const store = {
    name: settings?.name || siteConfig.name,
    phone: settings?.phone || '',
    email: settings?.email || '',
  }

  return (
    <div className="min-h-screen bg-background">
      <OrderReceiptToolbar backHref={`/order/${id}?token=${encodeURIComponent(token)}`} backLabel="К заказу" />
      <OrderReceipt order={order} store={store} settings={settings} />
    </div>
  )
}
