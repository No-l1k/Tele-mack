'use client'

import { useEffect, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import { OrderReceipt } from '@/components/order/order-receipt'
import { OrderReceiptToolbar } from '@/components/order/order-receipt-toolbar'
import { ordersApi, publicSettingsApi } from '@/lib/api'
import type { StoreSettings } from '@/lib/api'
import type { Order } from '@/types'
import { siteConfig } from '@/lib/site'

export default function AdminOrderPrintPage() {
  const params = useParams()
  const id = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        const [orderRes, settingsRes] = await Promise.all([
          ordersApi.getById(id),
          publicSettingsApi.get().catch(() => null),
        ])
        if (!cancelled) {
          setOrder(orderRes.data)
          setSettings(settingsRes?.data ?? null)
        }
      } catch {
        if (!cancelled) {
          setOrder(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Загрузка чека…
      </div>
    )
  }

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
      <OrderReceiptToolbar
        backHref={`/admin/orders/${id}`}
        backLabel="К заказу"
        editHref={`/admin/orders/${id}/receipt-edit`}
      />
      <OrderReceipt order={order} store={store} settings={settings} />
    </div>
  )
}
