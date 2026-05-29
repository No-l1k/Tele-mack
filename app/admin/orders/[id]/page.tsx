'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProductImage } from '@/components/ui/product-image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPrice, formatDate } from '@/lib/formatters'
import { ordersApi } from '@/lib/api'
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  CreditCard,
  Truck,
  Printer,
  Pencil,
} from 'lucide-react'
import { notFound, useParams } from 'next/navigation'
import type { Order, OrderStatus } from '@/types'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Принят',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
}

const paymentLabels: Record<string, string> = {
  cash: 'Наличными курьеру',
  card: 'Безналичная оплата (+15%)',
  pickup: 'Оплата при самовывозе',
}

const deliveryLabels: Record<string, string> = {
  courier: 'Курьером по Москве',
  pickup: 'Самовывоз',
}

export default function AdminOrderDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [status, setStatus] = useState<OrderStatus>('pending')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      try {
        setIsLoading(true)
        const response = await ordersApi.getById(id)
        if (!cancelled) {
          setOrder(response.data)
          setStatus(response.data.status)
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

    loadOrder()
    return () => {
      cancelled = true
    }
  }, [id])

  if (isLoading) {
    return <div className="text-muted-foreground">Загрузка заказа...</div>
  }

  if (!order) {
    notFound()
  }

  const saveStatus = async () => {
    const response = await ordersApi.updateStatus(order.id, status)
    setOrder(response.data)
  }

  const markAsPaid = async () => {
    const response = await ordersApi.markAsPaid(order.id)
    setOrder(response.data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Заказ #{order.id}</h1>
            <p className="text-muted-foreground">
              от {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href={`/admin/orders/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/orders/${id}/print`}>
              <Printer className="h-4 w-4 mr-2" />
              Товарный чек
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Состав заказа
              </CardTitle>
              <Badge className={statusColors[order.status]} variant="secondary">
                {statusLabels[order.status]}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="h-16 w-16 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      {item.productImage ? (
                        <ProductImage
                          src={item.productImage}
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="object-contain"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.price)} x {item.quantity} шт.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Товары</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Доставка</span>
                  <span>{order.deliveryCost > 0 ? formatPrice(order.deliveryCost) : 'Бесплатно'}</span>
                </div>
                {order.paymentSurcharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Наценка за способ оплаты</span>
                    <span>{formatPrice(order.paymentSurcharge)}</span>
                  </div>
                )}
                {(order.selectedServices ?? []).map((service) => (
                  <div key={service.id} className="flex justify-between">
                    <span className="text-muted-foreground">{service.name}</span>
                    <span>{formatPrice(service.price)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Итого</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order history/timeline could go here */}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Статус заказа</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={saveStatus}>
                Сохранить статус
              </Button>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Покупатель
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer.name}</span>
              </div>
              {order.customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Доставка
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Способ доставки</p>
                <p className="font-medium">{deliveryLabels[order.deliveryMethod]}</p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">
                  {order.address
                    ? `${order.address.city}, ${order.address.street}, д. ${order.address.house}${order.address.apartment ? `, кв. ${order.address.apartment}` : ''}`
                    : 'Не указан'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Оплата
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Способ оплаты</p>
                <p className="font-medium">{paymentLabels[order.paymentMethod]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Статус оплаты</p>
                <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                  {order.paymentStatus === 'paid' ? 'Оплачено' : 'Не оплачено'}
                </Badge>
              </div>
              {order.paymentStatus !== 'paid' && (
                <Button variant="outline" onClick={markAsPaid}>
                  Отметить оплачено
                </Button>
              )}
            </CardContent>
          </Card>

          {order.comment && (
            <Card>
              <CardHeader>
                <CardTitle>Комментарий</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.comment}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
