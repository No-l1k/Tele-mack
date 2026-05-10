'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { ordersApi } from '@/lib/api'
import { getSavedOrderAccesses, saveOrderAccess } from '@/lib/order-access'
import { isCompleteRuPhone } from '@/lib/phone'

export default function PublicOrdersPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const savedOrders = useMemo(() => getSavedOrderAccesses(), [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const parsed = Number(orderNumber.trim())
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Введите корректный номер заказа')
      return
    }
    if (!phone.trim()) {
      setError('Введите телефон, указанный при заказе')
      return
    }

    if (!isCompleteRuPhone(phone)) {
      setError('Введите телефон полностью в формате +7 (999) 999-99-99')
      return
    }

    setIsLoading(true)
    try {
      const response = await ordersApi.lookupPublicAccess(parsed, phone.trim())
      const data = response.data
      saveOrderAccess({
        orderId: String(data.orderId),
        orderNumber: data.orderNumber,
        token: data.publicToken,
        createdAt: data.createdAt,
      })
      window.location.href = `/order/${data.orderId}?token=${encodeURIComponent(data.publicToken)}`
    } catch {
      setError('Заказ не найден. Проверьте номер заказа и телефон.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Проверка заказа' },
            ]}
          />

          <h1 className="text-2xl font-bold mt-6 mb-6">Проверка заказа</h1>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Найти заказ</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="orderNumber">Номер заказа</Label>
                    <Input
                      id="orderNumber"
                      placeholder="Например: 123"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Телефон</Label>
                    <PhoneInput
                      id="phone"
                      placeholder="+7 (999) 999-99-99"
                      value={phone}
                      onValueChange={setPhone}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Проверяем...' : 'Открыть заказ'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Заказы на этом устройстве</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Список пока пуст. После оформления заказа ссылка сохраняется автоматически.
                  </p>
                ) : (
                  savedOrders.map((item) => (
                    <div key={item.orderId} className="flex items-center justify-between rounded border p-3">
                      <div>
                        <p className="font-medium">Заказ № {item.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('ru-RU')}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/order/${item.orderId}?token=${encodeURIComponent(item.token)}`}>Открыть</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
