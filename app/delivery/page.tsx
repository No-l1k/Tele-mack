import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, MapPin, Clock, CreditCard, Package, CheckCircle, Globe } from 'lucide-react'
import { DEFAULT_MIN_ORDER_AMOUNT_RUB } from '@/lib/constants'
import { formatPrice } from '@/lib/formatters'

export const metadata = {
  title: 'Доставка и оплата - TeleMakc',
  description: 'Информация о доставке и способах оплаты в интернет-магазине TeleMakc',
}

export default function DeliveryPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Доставка и оплата' },
            ]}
          />

          <h1 className="text-3xl font-bold mt-6 mb-8">Доставка и оплата</h1>

          {/* Delivery */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Способы доставки
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Курьерская доставка по Москве
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Базовая стоимость доставки - <strong>1 000 руб</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>За МКАД - <strong>+50 руб/км</strong> к базовому тарифу</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Доставка по России - <strong>100% предоплата</strong> после расчета ТК</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Срок доставки: 1-3 дня (при заказе до 19:00)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Самовывоз
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Бесплатно</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Проверка товара при получении</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Адрес пункта выдачи:
                    </p>
                    <p className="font-medium">
                      г. Москва, ул. Прасковьина, 21
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Минимальная сумма заказа:</strong> {formatPrice(DEFAULT_MIN_ORDER_AMOUNT_RUB)}. По Москве и Московской области действует фиксированный тариф 1 000 руб
                  и доплата 50 руб/км за МКАД. По России отправляем после 100% предоплаты товара и подтверждения стоимости перевозки транспортной компанией.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Regional & international delivery */}
          <section className="mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-start gap-3 text-base font-semibold uppercase tracking-wide leading-snug sm:text-lg">
                  <Globe className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                  <span>Доставка в другие регионы России и другие страны</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-3 pl-5 text-muted-foreground marker:text-primary">
                  <li>
                    Доставка заказов в другие регионы производится транспортными компаниями. Возможность
                    использования для доставки той или иной транспортной компании уточняйте до оплаты заказа.
                  </li>
                  <li>
                    Мы будем готовы выписать гарантийное письмо по поставке товара на фирменном бланке
                    компании.
                  </li>
                  <li className="font-semibold text-foreground">
                    Товар отгружается в транспортную компанию только при предварительной оплате 100% заказа.
                    Отправка заказа наложенным платежом не предусмотрена.
                  </li>
                  <li>
                    Стоимость услуг транспортной компании не входит в стоимость заказа. Оплата услуг
                    транспортной компании производится покупателем при получении отправления.
                    Ориентировочную стоимость перевозки может рассчитать для вас консультант интернет-магазина.
                  </li>
                  <li>
                    Стоимость доставки заказа до терминала транспортной компании в Москве рассчитывается в
                    соответствии с общими условиями доставки в пределах МКАД.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Payment */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Способы оплаты
            </h2>
            
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Наличными курьеру</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Оплата наличными при получении товара. Курьер предоставит чек.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Безналичная оплата
                    <span className="text-sm font-normal text-muted-foreground ml-2">(+15%)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Перевод на расчетный счет. Счет формируется после подтверждения заказа.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Оплата при самовывозе</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Оплата наличными или картой в точке самовывоза при получении товара.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
