'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, ArrowLeft, ShoppingCart, Heart } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { SectionHeader } from '@/components/ui/section-header'
import { ProductGrid } from '@/components/catalog/product-grid'
import { useCart } from '@/context/cart-context'
import { useFavorites } from '@/context/favorites-context'
import { formatPrice, formatItemsCount } from '@/lib/formatters'
import { getNewProducts } from '@/lib/data/catalog'
import { resolveMediaUrl } from '@/lib/media'
import { calculateDeliveryCost } from '@/lib/pricing'
import type { Product } from '@/types'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemsCount } = useCart()
  const deliveryCost = calculateDeliveryCost(total, 'courier')

  const { toggleFavorite, isFavorite } = useFavorites()
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const products = await getNewProducts(4)
        if (!cancelled) {
          setRecommendedProducts(products)
        }
      } catch {
        if (!cancelled) {
          setRecommendedProducts([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-6 md:py-8">
            <Breadcrumbs
              items={[
                { label: 'Главная', href: '/' },
                { label: 'Корзина' },
              ]}
            />
            
            <div className="text-center py-12 md:py-16">
              <ShoppingCart className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground/50 mx-auto mb-4 md:mb-6" />
              <h1 className="text-xl md:text-2xl font-bold mb-2">Корзина пуста</h1>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Добавьте товары из каталога, чтобы оформить заказ
              </p>
              <Button asChild size="lg">
                <Link href="/catalog">Перейти в каталог</Link>
              </Button>
            </div>

            {/* Recommended */}
            <section className="mt-8 md:mt-12">
              <SectionHeader title="Рекомендуем" href="/catalog/new" />
              <ProductGrid products={recommendedProducts} columns={4} />
            </section>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Корзина' },
            ]}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 md:mt-6 mb-6 md:mb-8">
            <h1 className="text-xl md:text-2xl font-bold">Корзина</h1>
            <Link 
              href="/catalog"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться к покупкам
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              {items.map(item => (
                <Card key={item.product.id}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex gap-3 md:gap-4">
                      {/* Image */}
                      <Link 
                        href={`/product/${item.product.slug}`}
                        className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 bg-muted/30 rounded-lg overflow-hidden"
                      >
                        <Image
                          src={resolveMediaUrl(item.product.images[0])}
                          alt={item.product.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-contain p-2"
                        />
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <Link 
                          href={`/product/${item.product.slug}`}
                          className="text-sm md:text-base font-medium hover:text-primary transition-colors line-clamp-2"
                        >
                          {item.product.name}
                        </Link>
                        
                        {/* Mobile: price under name */}
                        <div className="md:hidden mt-2 font-bold text-base">
                          {formatPrice(item.product.price * item.quantity)}
                        </div>
                        
                        {/* Quantity on mobile */}
                        <div className="md:hidden mt-2">
                          <QuantitySelector
                            value={item.quantity}
                            onChange={(value) => updateQuantity(item.product.id, value)}
                            max={item.product.quantity}
                            size="sm"
                          />
                        </div>
                        
                        <div className="flex items-center gap-3 md:gap-4 mt-auto pt-2 text-xs md:text-sm text-muted-foreground">
                          <button
                            onClick={() => toggleFavorite(item.product.id)}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Heart className="h-3 w-3" />
                            <span className="hidden sm:inline">
                              {isFavorite(item.product.id) ? 'В избранном' : 'В избранное'}
                            </span>
                          </button>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="flex items-center gap-1 text-destructive hover:underline"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Удалить</span>
                          </button>
                        </div>
                      </div>

                      {/* Price and quantity - desktop */}
                      <div className="hidden md:flex flex-col items-end gap-3">
                        <div className="font-bold text-lg">
                          {formatPrice(item.product.price * item.quantity)}
                        </div>
                        <QuantitySelector
                          value={item.quantity}
                          onChange={(value) => updateQuantity(item.product.id, value)}
                          max={item.product.quantity}
                          size="sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">В корзине</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatItemsCount(itemsCount)}</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Стоимость доставки</span>
                    <span>{deliveryCost === 0 ? 'Бесплатно' : formatPrice(deliveryCost)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Итого:</span>
                      <span className="text-xl md:text-2xl font-bold">{formatPrice(total + deliveryCost)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/checkout">Оформить заказ</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Recommended */}
          <section className="mt-8 md:mt-12">
            <SectionHeader title="Новинки" href="/catalog/new" />
            <ProductGrid products={recommendedProducts} columns={4} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
