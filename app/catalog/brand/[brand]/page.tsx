import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ProductGrid } from '@/components/catalog/product-grid'
import { SectionHeader } from '@/components/ui/section-header'
import { getProductsPage } from '@/lib/data/catalog'
import { CatalogProductsLoadMore } from '@/components/catalog/catalog-products-load-more'
import type { Metadata } from 'next'

type BrandPageProps = {
  params: Promise<{ brand: string }>
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brand } = await params
  const brandName = decodeURIComponent(brand)
  return {
    title: `${brandName} - Каталог`,
    description: `Товары бренда ${brandName} в каталоге`,
  }
}

export const dynamic = 'force-dynamic'

export default async function BrandCatalogPage({ params }: BrandPageProps) {
  const { brand } = await params
  const brandName = decodeURIComponent(brand)
  const pageSize = 24
  const fallbackResponse = {
    data: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
  }
  const response = await getProductsPage({ brands: [brandName] }, 1, pageSize).catch(() => fallbackResponse)

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Каталог', href: '/catalog' },
              { label: `Бренд ${brandName}` },
            ]}
          />
          <section className="mt-6">
            <SectionHeader title={`Бренд: ${brandName}`} />
            {response.total > pageSize ? (
              <CatalogProductsLoadMore
                initialProducts={response.data}
                initialPage={1}
                total={response.total}
                pageSize={pageSize}
                filters={{ brands: [brandName] }}
              />
            ) : (
              <ProductGrid products={response.data} columns={4} />
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
