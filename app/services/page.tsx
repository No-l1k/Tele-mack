import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone } from 'lucide-react'
import Link from 'next/link'
import { ServicesCards } from './services-cards'

export const metadata = {
  title: 'Услуги - TeleMakc',
  description: 'Дополнительные услуги: установка телевизора, проверка на битые пиксели, настройка',
}

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Услуги' },
            ]}
          />

          <div className="text-center max-w-2xl mx-auto mt-6 mb-12">
            <h1 className="text-3xl font-bold mb-4">Наши услуги</h1>
            <p className="text-muted-foreground text-lg">
              Мы предоставляем полный спектр услуг по установке и настройке техники.
              Все работы выполняются квалифицированными специалистами.
            </p>
          </div>

          <ServicesCards />

          {/* CTA */}
          <Card className="mt-12 bg-primary text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Нужна консультация?</h2>
              <p className="mb-6 opacity-90">
                Свяжитесь с нами, и мы подберем оптимальное решение для ваших задач
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="tel:+79268023497">
                  <Button variant="secondary" size="lg" className="gap-2">
                    <Phone className="h-5 w-5" />
                    +7 (926) 802-34-97
                  </Button>
                </Link>
                <Link href="/contacts">
                  <Button variant="outline" size="lg" className="border-primary-foreground/20 hover:bg-primary-foreground/10">
                    Написать нам
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
