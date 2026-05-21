'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ProductGrid } from '@/components/catalog/product-grid'
import { ProductFilters } from '@/components/catalog/product-filters'
import { ProductSort } from '@/components/catalog/product-sort'
import { 
  getProductFiltersMeta,
  getProductsPage,
} from '@/lib/data/catalog'
import { formatItemsCount } from '@/lib/formatters'
import type { Category, Product, ProductFilters as ProductFiltersType } from '@/types'

type CategoryPageClientProps = {
  categorySlug: string
  initialCategory?: Category
  initialProducts: Product[]
  initialTotal: number
  initialPriceRange: { min: number; max: number }
  initialBrands: string[]
  initialSpecFacets: Record<string, string[]>
  initialHasError: boolean
}

export default function CategoryPageClient({
  categorySlug,
  initialCategory,
  initialProducts,
  initialTotal,
  initialPriceRange,
  initialBrands,
  initialSpecFacets,
  initialHasError,
}: CategoryPageClientProps) {
  const [category, setCategory] = useState<Category | undefined>(initialCategory)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [total, setTotal] = useState(initialTotal)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 24
  const [isLoading, setIsLoading] = useState(!initialCategory && !initialHasError)
  const [isRefetching, setIsRefetching] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(Boolean(initialCategory) || initialHasError)
  const [hasError, setHasError] = useState(initialHasError)
  const [brands, setBrands] = useState<string[]>(initialBrands)
  const [computedPriceRange, setComputedPriceRange] = useState(initialPriceRange)

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedPriceRange, setSelectedPriceRange] = useState<[number, number]>([
    initialPriceRange.min,
    initialPriceRange.max,
  ])
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string[]>>({})
  const [specFacets, setSpecFacets] = useState<Record<string, string[]>>(initialSpecFacets)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<ProductFiltersType['sortBy']>('popular')
  const [didInitFilters, setDidInitFilters] = useState(
    initialPriceRange.max > 0 && initialPriceRange.max > initialPriceRange.min,
  )
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!hydrated) {
      setHydrated(true)
      return
    }
    let cancelled = false
    const normalizedSort = sortBy === 'newest' ? 'popular' : sortBy
    const activeSpecFilters = Object.fromEntries(
      Object.entries(selectedSpecFilters).filter(([, values]) => values.length > 0),
    )
    const filters: ProductFiltersType = {
      categorySlug,
      minPrice: selectedPriceRange[0] || undefined,
      maxPrice: selectedPriceRange[1] || undefined,
      brands: selectedBrands.length ? selectedBrands : undefined,
      inStock: inStockOnly || undefined,
      sortBy: normalizedSort,
      specFilters: Object.keys(activeSpecFilters).length ? activeSpecFilters : undefined,
    }

    async function loadCategoryData() {
      try {
        if (!hasLoadedOnce) {
          setIsLoading(true)
        } else {
          setIsRefetching(true)
        }
        setHasError(false)

        const [loadedProductsPage, meta] = await Promise.all([
          getProductsPage(filters, currentPage, pageSize),
          getProductFiltersMeta({
            categorySlug,
            inStock: inStockOnly || undefined,
          }),
        ])

        if (!cancelled) {
          setProducts(loadedProductsPage.data)
          setTotal(loadedProductsPage.total)
          setBrands(meta.brands)
          setComputedPriceRange(meta.priceRange)
          setSpecFacets(meta.specFacets ?? {})
          if (!didInitFilters && meta.priceRange.max > 0) {
            setSelectedPriceRange([meta.priceRange.min, meta.priceRange.max])
            setDidInitFilters(true)
          }
          setHasLoadedOnce(true)
        }
      } catch {
        if (!cancelled) {
          setHasError(true)
          if (!hasLoadedOnce) {
            setCategory(undefined)
          }
          setProducts([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsRefetching(false)
        }
      }
    }

    loadCategoryData()
    return () => {
      cancelled = true
    }
  }, [categorySlug, selectedBrands, selectedPriceRange, selectedSpecFilters, inStockOnly, sortBy, currentPage, didInitFilters])

  const resetFilters = () => {
    setSelectedBrands([])
    setSelectedPriceRange([computedPriceRange.min, computedPriceRange.max])
    setSelectedSpecFilters({})
    setInStockOnly(false)
    setCurrentPage(1)
  }

  const handleBrandsChange = (value: string[]) => {
    setCurrentPage(1)
    setSelectedBrands(value)
  }

  const handlePriceRangeChange = (value: [number, number]) => {
    setCurrentPage(1)
    setSelectedPriceRange(value)
  }

  const handleInStockChange = (value: boolean) => {
    setCurrentPage(1)
    setInStockOnly(value)
  }

  const handleSpecFiltersChange = (value: Record<string, string[]>) => {
    setCurrentPage(1)
    setSelectedSpecFilters(value)
  }

  const handleSortChange = (value: ProductFiltersType['sortBy']) => {
    setCurrentPage(1)
    setSortBy(value)
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (isLoading && !hasLoadedOnce) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12 md:py-16 text-center">
            <p className="text-sm md:text-base text-muted-foreground">Загрузка категории...</p>
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
          <div className="container mx-auto px-4 py-12 md:py-16 text-center">
            <h1 className="text-xl md:text-2xl font-bold mb-4">Не удалось загрузить категорию</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Проверьте подключение к API и попробуйте снова.
            </p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!category) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12 md:py-16 text-center">
            <h1 className="text-xl md:text-2xl font-bold mb-4">Категория не найдена</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              К сожалению, запрашиваемая категория не существует.
            </p>
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
              { label: 'Каталог', href: '/catalog' },
              { label: category.name },
            ]}
          />

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mt-4 md:mt-6">
            {/* Filters sidebar - desktop only */}
            <div className="hidden lg:block">
              <ProductFilters
                brands={brands}
                selectedBrands={selectedBrands}
                onBrandsChange={handleBrandsChange}
                priceRange={computedPriceRange}
                selectedPriceRange={selectedPriceRange}
                onPriceRangeChange={handlePriceRangeChange}
                inStockOnly={inStockOnly}
                onInStockChange={handleInStockChange}
                specFacets={specFacets}
                selectedSpecFilters={selectedSpecFilters}
                onSpecFiltersChange={handleSpecFiltersChange}
                onReset={resetFilters}
              />
            </div>

            {/* Products */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">{category.name}</h1>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                    {formatItemsCount(total)}
                  </p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
                  {/* Mobile filters */}
                  <div className="lg:hidden">
                    <ProductFilters
                      brands={brands}
                      selectedBrands={selectedBrands}
                      onBrandsChange={handleBrandsChange}
                      priceRange={computedPriceRange}
                      selectedPriceRange={selectedPriceRange}
                      onPriceRangeChange={handlePriceRangeChange}
                      inStockOnly={inStockOnly}
                      onInStockChange={handleInStockChange}
                      specFacets={specFacets}
                      selectedSpecFilters={selectedSpecFilters}
                      onSpecFiltersChange={handleSpecFiltersChange}
                      onReset={resetFilters}
                    />
                  </div>
                  <div className="flex-1 sm:flex-initial">
                    <ProductSort value={sortBy ?? 'popular'} onChange={(value) => handleSortChange(value as ProductFiltersType['sortBy'])} />
                  </div>
                </div>
              </div>

              <div className={isRefetching ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <ProductGrid products={products} columns={3} />
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Назад
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Страница {currentPage} из {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Вперёд
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
