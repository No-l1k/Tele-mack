import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SectionHeader } from '@/components/ui/section-header'
import { CategoryCard } from '@/components/catalog/category-card'
import { CatalogProductsLoadMore } from '@/components/catalog/catalog-products-load-more'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { getCategoryTree, getProductsPage } from '@/lib/data/catalog'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Каталог товаров',
  description: 'Полный каталог телевизоров, кронштейнов, саундбаров и аксессуаров. Выгодные цены, доставка по Москве.',
}
export const dynamic = 'force-dynamic'

export default async function CatalogPage() {
  const pageSize = 30
  const fallbackProductsPage = {
    data: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
  }
  const [categoryTree, productsPage] = await Promise.all([
    getCategoryTree().catch(() => []),
    getProductsPage(undefined, 1, pageSize).catch(() => fallbackProductsPage),
  ])
  const rootCategories = categoryTree.filter((category) => !category.parentId)

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Каталог' },
            ]}
          />
          
          <h1 className="text-3xl font-bold mt-4 mb-8">Каталог товаров</h1>

          {/* Categories */}
          <section className="mb-12">
            <SectionHeader title="Категории" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {rootCategories.map(category => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>

          {/* All products */}
          <section>
            <SectionHeader title="Все товары" />
            <CatalogProductsLoadMore
              initialProducts={productsPage.data}
              initialPage={productsPage.page}
              total={productsPage.total}
              pageSize={pageSize}
            />
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
