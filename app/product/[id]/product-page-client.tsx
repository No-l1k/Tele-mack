'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ProductImage } from '@/components/ui/product-image'
import { Heart, ShoppingCart, Truck, CheckCircle, BarChart3 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ProductGallery } from '@/components/product/product-gallery'
import { ProductGrid } from '@/components/catalog/product-grid'
import { ProductsCarousel } from '@/components/catalog/products-carousel'
import { Rating } from '@/components/ui/rating'
import { QuantitySelector } from '@/components/ui/quantity-selector'
import { SectionHeader } from '@/components/ui/section-header'
import { useCart } from '@/context/cart-context'
import { useFavorites } from '@/context/favorites-context'
import { publicSettingsApi } from '@/lib/api'
import { formatPrice, formatReviewsCount, calculateDiscount } from '@/lib/formatters'
import { resolveMediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'
import { isProductAvailableForPurchase } from '@/lib/product-availability'
import { isCompleteRuPhone } from '@/lib/phone'
import { prepareDescriptionHtml, sanitizeDescriptionHtml } from '@/lib/rich-text'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Category, Product } from '@/types'

type ProductPageClientProps = {
  initialProduct?: Product
  initialCategory?: Category
  initialRecommendedAccessories: Product[]
  initialRelatedProducts: Product[]
  initialHasError: boolean
}

export default function ProductPageClient({
  initialProduct,
  initialCategory,
  initialRecommendedAccessories,
  initialRelatedProducts,
  initialHasError,
}: ProductPageClientProps) {
  const router = useRouter()
  const [product] = useState<Product | undefined>(initialProduct)
  const [category] = useState<Category | undefined>(initialCategory)
  const [recommendedAccessories] = useState<Product[]>(initialRecommendedAccessories)
  const [relatedProducts] = useState<Product[]>(initialRelatedProducts)
  const [isLoading] = useState(false)
  const [hasError] = useState(initialHasError)
  const [quantity, setQuantity] = useState(1)
  const [quickOrderOpen, setQuickOrderOpen] = useState(false)
  const [quickOrderLoading, setQuickOrderLoading] = useState(false)
  const [quickOrderSuccess, setQuickOrderSuccess] = useState('')
  const [quickOrderError, setQuickOrderError] = useState('')
  const [quickOrderForm, setQuickOrderForm] = useState({
    name: '',
    phone: '',
    comment: '',
  })

  const { addItem, isInCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const safeDescriptionHtml = useMemo(
    () => {
      const sanitized = sanitizeDescriptionHtml(prepareDescriptionHtml(product?.description || ''))
      if (!sanitized || typeof window === 'undefined') return sanitized

      const parser = new DOMParser()
      const doc = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html')
      const root = doc.body.firstElementChild
      if (!root) return sanitized

      root.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src')
        if (!src) return
        img.setAttribute('src', resolveMediaUrl(src))
      })

      return root.innerHTML
    },
    [product?.description],
  )
  const safeServiceInfoHtml = useMemo(
    () => {
      const sanitized = sanitizeDescriptionHtml(prepareDescriptionHtml(product?.serviceInfo || ''))
      if (!sanitized || typeof window === 'undefined') return sanitized

      const parser = new DOMParser()
      const doc = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html')
      const root = doc.body.firstElementChild
      if (!root) return sanitized

      root.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src')
        if (!src) return
        img.setAttribute('src', resolveMediaUrl(src))
      })

      return root.innerHTML
    },
    [product?.serviceInfo],
  )

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <p className="text-muted-foreground">Загрузка товара...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (hasError) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Ошибка загрузки товара</h1>
            <p className="text-muted-foreground mb-6">
              Не удалось получить данные из API. Попробуйте обновить страницу.
            </p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!product) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Товар не найден</h1>
            <p className="text-muted-foreground mb-6">
              К сожалению, запрашиваемый товар не существует или был удален.
            </p>
            <Button asChild>
              <Link href="/catalog">Перейти в каталог</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const discount = product.oldPrice ? calculateDiscount(product.price, product.oldPrice) : 0
  const inCart = isInCart(product.id)
  const favorite = isFavorite(product.id)
  const cashPrice = product.price
  const cashlessPrice = Math.round(product.price * 1.15)

  const handleAddToCart = () => {
    if (inCart) {
      router.push('/cart')
      return
    }
    addItem(product, quantity)
  }

  const handleQuickOrderSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuickOrderError('')
    setQuickOrderSuccess('')

    if (!isCompleteRuPhone(quickOrderForm.phone)) {
      setQuickOrderError('Введите телефон полностью в формате +7 (999) 999-99-99')
      return
    }

    setQuickOrderLoading(true)

    try {
      await publicSettingsApi.sendQuickOrder({
        productId: product.id,
        name: quickOrderForm.name.trim(),
        phone: quickOrderForm.phone.trim(),
        comment: quickOrderForm.comment.trim() || undefined,
      })
      setQuickOrderSuccess('Заявка отправлена! Мы свяжемся с вами в ближайшее время.')
      setQuickOrderForm({ name: '', phone: '', comment: '' })
    } catch (error) {
      setQuickOrderError(error instanceof Error ? error.message : 'Не удалось отправить заявку')
    } finally {
      setQuickOrderLoading(false)
    }
  }

  const stockStatusLabel = {
    in_stock: 'В наличии',
    low_stock: 'Мало',
    preorder: 'Под заказ',
    out_of_stock: 'Нет в наличии',
  }[product.stockStatus]

  const canPurchase = isProductAvailableForPurchase(product)

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Каталог', href: '/catalog' },
              ...(category ? [{ label: category.name, href: `/catalog/${category.slug}` }] : []),
              { label: product.name },
            ]}
          />

          {/* Product main section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            {/* Gallery */}
            <ProductGallery images={product.images} productName={product.name} />

            {/* Info */}
            <div className="space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {discount > 0 && (
                  <Badge variant="destructive">Скидка {discount}%</Badge>
                )}
                {product.isNew && (
                  <Badge className="bg-green-500 hover:bg-green-600">Новинка</Badge>
                )}
                {product.isHit && (
                  <Badge className="bg-orange-500 hover:bg-orange-600">Хит продаж</Badge>
                )}
                {canPurchase ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {stockStatusLabel}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    {stockStatusLabel}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl lg:text-3xl font-bold">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <Rating value={product.rating} showValue />
                <span className="text-sm text-muted-foreground">
                  {formatReviewsCount(product.reviewsCount)}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
                {product.oldPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.oldPrice)}
                  </span>
                )}
              </div>

              {/* Short description */}
              {product.shortDescription && (
                <p className="text-muted-foreground">{product.shortDescription}</p>
              )}
              <div className="text-sm text-muted-foreground space-y-1">
                {product.sku && <p>Артикул: {product.sku}</p>}
                {product.gtin && <p>GTIN/EAN: {product.gtin}</p>}
                {product.warrantyMonths !== undefined && product.warrantyMonths !== null && (
                  <p>Гарантия: {product.warrantyMonths} мес{product.warrantyType ? `, ${product.warrantyType}` : ''}</p>
                )}
              </div>

              {/* Quantity and Add to cart */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                />
                <div className="flex gap-2 flex-1 sm:flex-initial">
                  <Button
                    size="lg"
                    className={cn(
                      'gap-2 flex-1 sm:flex-initial cursor-pointer transition-all duration-200',
                      'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm',
                      'disabled:cursor-not-allowed',
                    )}
                    onClick={handleAddToCart}
                    disabled={!canPurchase}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {inCart ? 'В корзине' : 'В корзину'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className={cn(favorite && 'text-red-500 border-red-500')}
                    onClick={() => toggleFavorite(product.id, product)}
                  >
                    <Heart className={cn('h-5 w-5', favorite && 'fill-current')} />
                    <span className="sr-only">В избранное</span>
                  </Button>
                  <Button size="lg" variant="outline" disabled title="Скоро будет доступно">
                    <BarChart3 className="h-5 w-5" />
                    <span className="sr-only">Сравнить</span>
                  </Button>
                </div>
              </div>

              {/* Buy in one click */}
              <Dialog
                open={quickOrderOpen}
                onOpenChange={(open) => {
                  setQuickOrderOpen(open)
                  if (!open) {
                    setQuickOrderError('')
                    setQuickOrderSuccess('')
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">Купить в 1 клик</Button>
                </DialogTrigger>
                <DialogContent
                  className="p-0 overflow-hidden"
                  style={{ width: 'min(96vw, 700px)', maxWidth: '700px' }}
                >
                  <DialogTitle className="sr-only">Быстрый заказ</DialogTitle>
                  <div className="p-6 space-y-5">
                    {quickOrderSuccess ? (
                      <div className="border-t pt-6">
                        <div className="text-center py-6">
                          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">Заявка отправлена!</h3>
                          <p className="text-muted-foreground mb-6">{quickOrderSuccess}</p>
                          <Button className="cursor-pointer" onClick={() => setQuickOrderOpen(false)}>Закрыть</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-[180px_1fr] items-start">
                          <div className="relative h-[110px] w-full overflow-hidden rounded-md border bg-muted/30">
                            {product.images[0] ? (
                              <ProductImage
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-contain"
                              />
                            ) : null}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xl font-semibold leading-tight">{product.name}</p>
                            <p className="text-3xl font-bold">{formatPrice(product.price)}</p>
                            <p className="text-sm text-muted-foreground">
                              Укажите свое имя и телефон.
                              <br />
                              Мы свяжемся с Вами для уточнения адреса и времени доставки.
                            </p>
                          </div>
                        </div>
                        <form onSubmit={handleQuickOrderSubmit} className="space-y-4 border-t pt-5">
                        <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
                          <Label htmlFor="quick-name">Ваше имя:</Label>
                          <Input
                            id="quick-name"
                            placeholder="Имя Фамилия"
                            value={quickOrderForm.name}
                            onChange={(e) => setQuickOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
                          <Label htmlFor="quick-phone">Контактный телефон:</Label>
                          <PhoneInput
                            id="quick-phone"
                            value={quickOrderForm.phone}
                            onValueChange={(value) =>
                              setQuickOrderForm((prev) => ({ ...prev, phone: value }))
                            }
                            required
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-start">
                          <Label htmlFor="quick-comment" className="pt-2">Комментарий:</Label>
                          <Textarea
                            id="quick-comment"
                            rows={4}
                            placeholder="Комментарий к заказу (необязательно)"
                            value={quickOrderForm.comment}
                            onChange={(e) => setQuickOrderForm((prev) => ({ ...prev, comment: e.target.value }))}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Нажимая кнопку &quot;Купить&quot;, вы принимаете{' '}
                          <Link href="/privacy" className="underline hover:no-underline">
                            политику конфиденциальности и обработки персональных данных
                          </Link>.
                        </p>
                        {quickOrderError && <p className="text-sm text-destructive">{quickOrderError}</p>}
                        <div className="flex items-center justify-between gap-3">
                          <Button type="button" variant="outline" onClick={() => setQuickOrderOpen(false)}>
                            Отмена
                          </Button>
                          <Button type="submit" disabled={quickOrderLoading}>
                            {quickOrderLoading ? 'Отправляем...' : 'Купить'}
                          </Button>
                        </div>
                        </form>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Features */}
              <div className="flex items-start gap-3 pt-4 border-t">
                <Truck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Доставка по фиксированному тарифу</div>
                  <div className="text-xs text-muted-foreground">1 000 руб по Москве и МО, за МКАД +50 руб/км</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Цена при оплате наличными</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-900">{formatPrice(cashPrice)}</p>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">Цена по безналичному расчёту</p>
                  <p className="mt-1 text-lg font-semibold text-amber-900">{formatPrice(cashlessPrice)}</p>
                  <p className="text-xs text-amber-700">+15% к базовой цене</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="description" className="mt-12">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Описание
              </TabsTrigger>
              <TabsTrigger 
                value="specs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Характеристики
              </TabsTrigger>
              <TabsTrigger
                value="service"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Сервисные услуги
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div
                className={cn(
                  'prose prose-sm max-w-none text-sm leading-6',
                  '[&_section]:max-w-[820px] [&_section]:my-3 sm:[&_section]:my-4',
                  '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg sm:[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-snug',
                  '[&_p]:my-2 [&_p]:leading-6',
                  '[&_figure]:max-w-[820px] [&_figure]:my-3 sm:[&_figure]:my-4 [&_figure]:overflow-hidden [&_figure]:rounded-md [&_figure]:bg-muted/20',
                  '[&_img]:block [&_img]:w-full [&_img]:h-auto [&_img]:max-h-[220px] sm:[&_img]:max-h-[320px] lg:[&_img]:max-h-[380px] [&_img]:object-contain',
                  '[&_ul]:my-2 [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:pl-5',
                )}
              >
                <div dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }} />
              </div>
            </TabsContent>

            <TabsContent value="specs" className="mt-6">
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {Object.entries(product.specs).map(([key, value], index) => (
                      <tr key={key} className={index % 2 === 0 ? 'bg-background' : ''}>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-1/3">{key}</td>
                        <td className="px-4 py-3 text-sm font-medium">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="service" className="mt-6">
              {safeServiceInfoHtml ? (
                <div
                  className={cn(
                    'prose prose-sm max-w-none text-sm leading-6',
                    '[&>div>div]:grid [&>div>div]:gap-6 md:[&>div>div]:grid-cols-2 md:[&>div>div]:gap-x-10 md:[&>div>div]:gap-y-8',
                    '[&_section]:max-w-none [&_section]:my-0',
                    '[&_h2]:mt-0 [&_h2]:mb-2 [&_h2]:text-lg sm:[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-snug',
                    '[&_p]:my-2 [&_p]:leading-6',
                    '[&_figure]:max-w-[820px] [&_figure]:my-3 sm:[&_figure]:my-4 [&_figure]:overflow-hidden [&_figure]:rounded-md [&_figure]:bg-muted/20',
                    '[&_img]:block [&_img]:w-full [&_img]:h-auto [&_img]:max-h-[220px] sm:[&_img]:max-h-[320px] lg:[&_img]:max-h-[380px] [&_img]:object-contain',
                    '[&_ul]:my-2 [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:pl-5',
                  )}
                >
                  <div dangerouslySetInnerHTML={{ __html: safeServiceInfoHtml }} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Информация о сервисных услугах для этого товара пока не заполнена.</p>
              )}
            </TabsContent>
          </Tabs>

          {recommendedAccessories.length > 0 && (
            <section className="relative left-1/2 mt-12 w-screen -translate-x-1/2 bg-zinc-800 text-zinc-100">
              <div className="px-4 py-6 sm:px-6 lg:px-10">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-200">Рекомендуемые аксессуары</h2>
                <ProductsCarousel products={recommendedAccessories} centerWhenFew />
              </div>
            </section>
          )}

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <section className="mt-12">
              <SectionHeader 
                title="Похожие товары" 
                href={`/catalog/${product.categorySlug}`}
              />
              <ProductGrid products={relatedProducts} columns={4} />
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
