'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ProductGrid } from '@/components/catalog/product-grid'
import { searchProducts } from '@/lib/data/catalog'
import type { Product } from '@/types'
import { formatItemsCount } from '@/lib/formatters'
import { Search, Loader2 } from 'lucide-react'

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runSearch() {
      if (!query) {
        setResults([])
        setHasError(false)
        return
      }

      try {
        setIsLoading(true)
        const data = await searchProducts(query)
        if (!cancelled) {
          setResults(data)
          setHasError(false)
        }
      } catch {
        if (!cancelled) {
          setResults([])
          setHasError(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    runSearch()
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="mt-6">
      <h1 className="text-2xl font-bold mb-2">
        {query ? `Результаты поиска: "${query}"` : 'Поиск'}
      </h1>
      
      {query && (
        <p className="text-muted-foreground mb-8">
          {hasError
            ? 'Ошибка загрузки поиска'
            : results.length > 0 
            ? formatItemsCount(results.length)
            : 'Ничего не найдено'}
        </p>
      )}

      {!query && (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Введите запрос в строку поиска
          </p>
        </div>
      )}

      {query && !isLoading && hasError && (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Не удалось выполнить поиск</p>
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => window.location.reload()}
          >
            Повторить
          </button>
        </div>
      )}

      {query && !isLoading && !hasError && results.length === 0 && (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            По запросу &quot;{query}&quot; ничего не найдено
          </p>
          <p className="text-sm text-muted-foreground">
            Попробуйте изменить запрос или посмотрите наш каталог
          </p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <ProductGrid products={results} columns={4} />
      )}
    </div>
  )
}

function SearchLoading() {
  return (
    <div className="mt-6">
      <div className="h-8 w-64 bg-muted animate-pulse rounded mb-4" />
      <div className="text-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Поиск' },
            ]}
          />

          <Suspense fallback={<SearchLoading />}>
            <SearchResults />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
