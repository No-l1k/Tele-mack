'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ProductGrid } from '@/components/catalog/product-grid'
import { Button } from '@/components/ui/button'
import { getProductsPage } from '@/lib/data/catalog'
import type { Product, ProductFilters } from '@/types'

interface CatalogProductsLoadMoreProps {
  initialProducts: Product[]
  initialPage: number
  total: number
  pageSize: number
  filters?: ProductFilters
}

export function CatalogProductsLoadMore({
  initialProducts,
  initialPage,
  total,
  pageSize,
  filters,
}: CatalogProductsLoadMoreProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const hasMore = products.length < total

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return

    try {
      setIsLoadingMore(true)
      setLoadError(null)
      const nextPage = currentPage + 1
      const response = await getProductsPage(filters, nextPage, pageSize)
      setProducts((prev) => [...prev, ...response.data])
      setCurrentPage(nextPage)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить следующую страницу'
      setLoadError(message)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="space-y-6">
      <ProductGrid products={products} columns={4} />

      {hasMore && (
        <div className="flex flex-col items-center gap-3">
          <Button type="button" variant="outline" size="lg" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаем...
              </>
            ) : (
              'Ещё товары'
            )}
          </Button>
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        </div>
      )}
    </div>
  )
}
