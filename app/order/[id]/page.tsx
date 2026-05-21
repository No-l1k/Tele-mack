import Link from 'next/link'
import { CheckCircle, Phone, MessageCircle, Printer } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  formatPrice,
  formatDateTime,
  formatDeliveryMethod,
  formatOrderStatus,
  formatPaymentMethod,
} from '@/lib/formatters'
import { STORE_PHONE_PRIMARY } from '@/lib/store-contacts'
import { fetchPublicOrder } from '@/lib/server-store'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface OrderPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { id } = await params
  const { token } = await searchParams
  const order = token ? await fetchPublicOrder(id, token) : null

  if (!order) {
    notFound()
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Success message */}
            <Card className="mb-8 border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-green-800">
                      Заказ № {order.number} успешно оформлен!
                    </h1>
                    <p className="text-green-700">
                      Мы свяжемся с вами в ближайшее время для подтверждения
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order info */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Информация о заказе</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Дата оформления</p>
                    <p className="font-medium">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Сумма и статус</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatPrice(order.total)}</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {formatOrderStatus(order.status)}
                      </Badge>
                      <Badge variant="outline">{order.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен'}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Получать уведомления в мессенджерах
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={`viber://chat?number=${STORE_PHONE_PRIMARY.digits}`}
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                    >
                      <MessageCircle className="h-6 w-6" />
                    </a>
                    <a
                      href="https://t.me/telemakc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Способ оплаты</p>
                    <p className="font-medium">{formatPaymentMethod(order.paymentMethod)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Способ доставки</p>
                    <p className="font-medium">{formatDeliveryMethod(order.deliveryMethod)}</p>
                    {order.deliveryMethod === 'courier' && (
                      <p className="text-sm text-muted-foreground">
                        Доставка по Москве и МО - 1 000 руб. За МКАД дополнительно +50 руб/км. По России отправка осуществляется после 100% предоплаты и расчета транспортной компанией.
                      </p>
                    )}
                  </div>
                </div>

                {order.address && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Адрес доставки</p>
                    <p className="font-medium">
                      {order.address.city}, {order.address.street}, д. {order.address.house}
                      {order.address.apartment && `, кв. ${order.address.apartment}`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Получатель</p>
                    <p className="font-medium">{order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="font-medium">{order.customer.phone}</p>
                  </div>
                </div>

                {order.customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{order.customer.email}</p>
                  </div>
                )}

                {order.comment && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Комментарий к заказу</p>
                    <p>{order.comment}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order items */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Состав заказа</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                          Наименование
                        </th>
                        <th className="text-center py-3 text-sm font-medium text-muted-foreground">
                          Кол-во
                        </th>
                        <th className="text-right py-3 text-sm font-medium text-muted-foreground">
                          Стоимость
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3">{item.productName}</td>
                          <td className="py-3 text-center">{item.quantity}</td>
                          <td className="py-3 text-right font-medium">
                            {formatPrice(item.total)}
                          </td>
                        </tr>
                      ))}
                      {order.paymentSurcharge > 0 && (
                        <tr className="border-b">
                          <td className="py-3">Наценка на способ оплаты</td>
                          <td className="py-3 text-center">-</td>
                          <td className="py-3 text-right font-medium">
                            {formatPrice(order.paymentSurcharge)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} className="py-3 text-right font-semibold">
                          Итого:
                        </td>
                        <td className="py-3 text-right text-lg font-bold">
                          {formatPrice(order.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {token ? (
                <Button asChild variant="outline">
                  <Link
                    href={`/order/${id}/print?token=${encodeURIComponent(token)}`}
                    className="inline-flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Товарный чек для печати
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href="/orders">Проверить другой заказ</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/catalog">Продолжить покупки</Link>
              </Button>
              <Button asChild>
                <Link href="/contacts" className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Связаться с нами
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
