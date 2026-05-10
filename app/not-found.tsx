import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <span className="text-8xl font-bold text-primary">404</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Страница не найдена</h1>
          <p className="text-muted-foreground mb-8">
            К сожалению, запрашиваемая страница не существует или была удалена.
            Возможно, вы перешли по устаревшей ссылке.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                На главную
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/catalog">
                <Search className="h-4 w-4 mr-2" />
                Каталог товаров
              </Link>
            </Button>
          </div>
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Популярные категории:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/catalog/televizory">Телевизоры</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/catalog/kronshteyny">Кронштейны</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/catalog/saundbary">Саундбары</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
