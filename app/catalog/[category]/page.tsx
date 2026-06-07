import { getCategoryBySlug, getProductFiltersMeta, getProductsPage } from '@/lib/data/catalog'
import type { ProductFilters } from '@/types'
import CategoryPageClient from './category-page-client'

type CategoryPageProps = {
  params: Promise<{ category: string }>
}

const PAGE_SIZE = 24

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params
  const initialFilters: ProductFilters = {
    categorySlug,
    sortBy: 'popular',
  }

  try {
    const [category, productsPage, meta] = await Promise.all([
      getCategoryBySlug(categorySlug),
      getProductsPage(initialFilters, 1, PAGE_SIZE),
      getProductFiltersMeta({ categorySlug }),
    ])

    return (
      <CategoryPageClient
        categorySlug={categorySlug}
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
        categorySlug={categorySlug}
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
