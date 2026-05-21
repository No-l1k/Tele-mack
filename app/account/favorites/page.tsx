'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/catalog/product-grid'
import { useFavorites } from '@/context/favorites-context'

export default function FavoritesPage() {
  const { favorites, favoriteProducts, isLoadingProducts } = useFavorites()

  const hasFavorites = favorites.length > 0
  const showGrid = favoriteProducts.length > 0

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Личный кабинет', href: '/account' },
              { label: 'Избранное' },
            ]}
          />

          <h1 className="text-2xl font-bold mt-6 mb-8">Избранное</h1>

          {showGrid ? (
            <ProductGrid products={favoriteProducts} columns={4} />
          ) : hasFavorites && isLoadingProducts ? (
            <p className="text-muted-foreground">Загрузка товаров...</p>
          ) : (
            <div className="text-center py-16">
              <Heart className="h-20 w-20 text-muted-foreground/50 mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-2">В избранном пусто</h2>
              <p className="text-muted-foreground mb-6">
                Добавляйте товары в избранное, чтобы не потерять их
              </p>
              <Button asChild size="lg">
                <Link href="/catalog">Перейти в каталог</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
