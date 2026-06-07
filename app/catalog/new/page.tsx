import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SectionHeader } from '@/components/ui/section-header'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { CatalogProductsLoadMore } from '@/components/catalog/catalog-products-load-more'
import { getProductsPage } from '@/lib/data/catalog'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Новинки',
  description: 'Новые поступления товаров в каталоге.',
}

export const dynamic = 'force-dynamic'

export default async function NewProductsPage() {
  const pageSize = 30
  const filters = { isNew: true as const }
  const fallbackProductsPage = {
    data: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
  }
  const productsPage = await getProductsPage(filters, 1, pageSize).catch(() => fallbackProductsPage)

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Каталог', href: '/catalog' },
              { label: 'Новинки' },
            ]}
          />

          <h1 className="text-3xl font-bold mt-4 mb-8">Новинки</h1>

          <section>
            <SectionHeader title="Новые товары" />
            <CatalogProductsLoadMore
              initialProducts={productsPage.data}
              initialPage={productsPage.page}
              total={productsPage.total}
              pageSize={pageSize}
              filters={filters}
            />
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
