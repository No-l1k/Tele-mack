'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, ShoppingCart, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useCart } from '@/context/cart-context'
import { useFavorites } from '@/context/favorites-context'
import { formatPrice, calculateDiscount } from '@/lib/formatters'
import type { Product } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { resolveMediaUrl } from '@/lib/media'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter()
  const { addItem, isInCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  
  const discount = product.oldPrice ? calculateDiscount(product.price, product.oldPrice) : 0
  const inCart = isInCart(product.id)
  const favorite = isFavorite(product.id)

  const handleCartButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (inCart) {
      router.push('/cart')
      return
    }
    addItem(product)
    toast.addedToCart(product.name)
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(product.id)
    if (favorite) {
      toast.removedFromFavorites(product.name)
    } else {
      toast.addedToFavorites(product.name)
    }
  }

  return (
    <Card className={cn(
      'group relative h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg border-border/50 hover:border-primary/30',
      className
    )}>
      <Link href={`/product/${product.slug}`} className="flex flex-col h-full">
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {discount > 0 && (
            <Badge variant="destructive" className="text-xs font-semibold px-1.5 py-0.5">
              -{discount}%
            </Badge>
          )}
          {product.isNew && (
            <Badge className="bg-green-500 hover:bg-green-600 text-xs font-semibold px-1.5 py-0.5">
              Новинка
            </Badge>
          )}
          {product.isHit && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-xs font-semibold px-1.5 py-0.5">
              Хит
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm',
              favorite && 'opacity-100 text-red-500 bg-red-50'
            )}
            onClick={handleToggleFavorite}
          >
            <Heart className={cn('h-3.5 w-3.5', favorite && 'fill-current')} />
            <span className="sr-only">В избранное</span>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            type="button"
            disabled
            title="Скоро будет доступно"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="sr-only">Сравнить</span>
          </Button>
        </div>

        {/* Image */}
        <div className="aspect-square bg-muted/20 relative overflow-hidden flex-shrink-0">
          <Image
            src={resolveMediaUrl(product.images[0])}
            alt={product.name}
            fill
            unoptimized
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>

        <CardContent className="flex flex-col flex-1 p-3">
          {/* Name - fixed height */}
          <h3 className="text-sm font-medium leading-snug line-clamp-2 h-10 mb-2">
            {product.name}
          </h3>

          {/* Stock status */}
          <p className={cn(
            'text-xs mb-2',
            product.inStock ? 'text-green-600' : 'text-muted-foreground'
          )}>
            {product.inStock ? 'В наличии' : 'Под заказ'}
          </p>

          {/* Price - fixed height area */}
          <div className="mt-auto">
            <div className="flex flex-col gap-0.5 mb-2">
              {product.oldPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.oldPrice)}
                </span>
              )}
              <span className="text-base font-bold text-foreground truncate">
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Add to cart button */}
            <Button
              className="w-full h-9 text-sm gap-1.5 cursor-pointer"
              variant={inCart ? 'secondary' : 'default'}
              size="sm"
              onClick={handleCartButtonClick}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="truncate">{inCart ? 'В корзине' : 'В корзину'}</span>
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
