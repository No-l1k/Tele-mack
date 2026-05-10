'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSavedOrderAccesses } from '@/lib/order-access'

export default function OrdersPage() {
  const orders = useMemo(() => getSavedOrderAccesses(), [])

  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Личный кабинет', href: '/account' },
              { label: 'Мои заказы' },
            ]}
          />

          <h1 className="text-2xl font-bold mt-6 mb-8">Мои заказы</h1>

          <Card>
            <CardHeader>
              <CardTitle>История заказов</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map(order => (
                    <Link
                      key={order.orderId}
                      href={`/order/${order.orderId}?token=${encodeURIComponent(order.token)}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">Заказ № {order.orderNumber}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">На этом устройстве пока нет сохраненных заказов</h3>
                  <p className="text-muted-foreground mb-6">
                    После оформления заказа ссылка появится здесь автоматически
                  </p>
                  <Button asChild>
                    <Link href="/orders">Найти заказ по номеру</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
