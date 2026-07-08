import { getCategoryBySlug, getProductFiltersMeta, getProductsPage } from '@/lib/data/catalog'
import type { ProductFilters } from '@/types'
import CategoryPageClient from '../[category]/category-page-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Новинки',
  description: 'Новые поступления товаров в каталоге.',
}

const CATEGORY_SLUG = 'new'
const PAGE_SIZE = 24

export const dynamic = 'force-dynamic'

export default async function NewProductsPage() {
  const initialFilters: ProductFilters = {
    categorySlug: CATEGORY_SLUG,
    sortBy: 'popular',
  }

  try {
    const [category, productsPage, meta] = await Promise.all([
      getCategoryBySlug(CATEGORY_SLUG),
      getProductsPage(initialFilters, 1, PAGE_SIZE),
      getProductFiltersMeta({ categorySlug: CATEGORY_SLUG }),
    ])

    return (
      <CategoryPageClient
        categorySlug={CATEGORY_SLUG}
        initialCategory={category}
        initialProducts={productsPage.data}
        initialTotal={productsPage.total}
        initialPriceRange={meta.priceRange}
        initialBrands={meta.brands}
        initialSpecFacets={meta.specFacets ?? {}}
        initialHasError={false}
      />
    )
  } catch {
    return (
      <CategoryPageClient
        categorySlug={CATEGORY_SLUG}
        initialCategory={undefined}
        initialProducts={[]}
        initialTotal={0}
        initialPriceRange={{ min: 0, max: 0 }}
        initialBrands={[]}
        initialSpecFacets={{}}
        initialHasError={true}
      />
    )
  }
}
