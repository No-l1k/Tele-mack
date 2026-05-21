import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: 'Гарантии - TeleMakc',
  description: 'Информация о гарантийном обслуживании товаров в интернет-магазине TeleMakc',
}

export default function WarrantyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Гарантии' },
            ]}
          />

          <div className="max-w-3xl mx-auto">
            <div className="text-center mt-6 mb-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Гарантии</h1>
              <p className="text-muted-foreground text-lg">
                Мы продаем только оригинальную технику с гарантией
              </p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Гарантия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Вся техника, представленная в нашем магазине, имеет гарантию. 
                    Срок гарантии зависит от типа товара и бренда:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Телевизоры:</strong> 12 месяцев</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Саундбары:</strong> 12 месяцева</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Кронштейны:</strong> 12 месяцев</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Аксессуары:</strong> 6-12 месяцев</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Что покрывает гарантия</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Заводские дефекты и неисправности</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Выход из строя комплектующих при нормальной эксплуатации</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Проблемы с программным обеспечением (для Smart TV)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Что не покрывает гарантия</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>Механические повреждения (трещины, сколы, царапины)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>Повреждения от воды, огня или перепадов напряжения</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>Неисправности, вызванные неправильной эксплуатацией</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>Естественный износ (выгорание пикселей после гарантийного срока)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Как получить гарантийное обслуживание</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="space-y-3 list-decimal list-inside">
                    <li>Свяжитесь с нами по телефону или через WhatsApp</li>
                    <li>Опишите проблему с товаром</li>
                    <li>Предоставьте чек или номер заказа</li>
                    <li>Мы организуем диагностику и ремонт или замену товара</li>
                  </ol>
                  
                  <div className="pt-4 border-t">
                    <Button asChild>
                      <Link href="/contacts">Связаться с нами</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Важно:</strong> Сохраняйте чек и упаковку товара в течение 
                    гарантийного срока. Это ускорит процесс гарантийного обслуживания.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
