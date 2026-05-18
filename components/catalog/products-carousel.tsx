'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from './product-card'
import type { Product } from '@/types'
import { cn } from '@/lib/utils'

interface ProductsCarouselProps {
  products: Product[]
  centerWhenFew?: boolean
}

export function ProductsCarousel({ products, centerWhenFew = false }: ProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isCenteredLayout = centerWhenFew && products.length <= 4

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.querySelector('div')?.offsetWidth || 250
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -cardWidth - 16 : cardWidth + 16,
        behavior: 'smooth',
      })
    }
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Товары не найдены</p>
      </div>
    )
  }

  return (
    <div className="relative group/carousel">
      {/* Scroll buttons */}
      {!isCenteredLayout && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg hidden md:flex"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Назад</span>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg hidden md:flex"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Вперед</span>
          </Button>
        </>
      )}

      {/* Products container */}
      <div
        ref={scrollRef}
        className={cn(
          'grid grid-flow-col auto-cols-[minmax(160px,280px)] sm:auto-cols-[minmax(200px,300px)] md:auto-cols-[minmax(220px,320px)] lg:auto-cols-[minmax(240px,340px)] gap-4 pb-2 px-4',
          isCenteredLayout
            ? 'justify-center overflow-x-hidden'
            : 'overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4',
        )}
      >
        {products.map(product => (
          <div
            key={product.id}
            className="snap-start"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  )
}
