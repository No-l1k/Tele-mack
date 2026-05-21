import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { SectionHeader } from '@/components/ui/section-header'
import { ProductsCarousel } from '@/components/catalog/products-carousel'
import { CategoryCard } from '@/components/catalog/category-card'
import { Button } from '@/components/ui/button'
import { 
  getBrands,
  getCategoryTree,
  getNewProducts,
} from '@/lib/data/catalog'
import Link from 'next/link'
import { STORE_PHONES, STORE_WHATSAPP_DIGITS } from '@/lib/store-contacts'
import { Truck, Shield, CreditCard, Headphones } from 'lucide-react'

export const dynamic = 'force-dynamic'

const features = [
  {
    icon: Truck,
    title: 'Доставка по Москве и МО',
    description: 'Фиксировано 1 000 руб, за МКАД +50 руб/км',
  },
  {
    icon: Shield,
    title: 'Гарантия качества',
    description: 'Гарантия на все товары от 1 года',
  },
  {
    icon: CreditCard,
    title: 'Удобная оплата',
    description: 'Наличными, картой при получении или безналичным расчетом',
  },
  {
    icon: Headphones,
    title: 'Поддержка 24/7',
    description: 'Всегда готовы помочь с выбором',
  },
]

export default async function HomePage() {
  const [categories, newProducts, brands] = await Promise.all([
    getCategoryTree().catch(() => []),
    getNewProducts().catch(() => []),
    getBrands(12).catch(() => []),
  ])
  const rootCategories = categories
    .filter((category) => !category.parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Slider */}
        <HeroSection />

        {/* Categories */}
        <section className="py-8 md:py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-[1440px]">
            <SectionHeader title="Категории" href="/catalog" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
              {rootCategories.map(category => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
            <div className="mt-6">
              <SectionHeader title="Бренды" href="/catalog" />
              <div className="flex flex-wrap gap-2">
                {brands.map((brand) => (
                  <Link
                    key={brand}
                    href={`/catalog/brand/${encodeURIComponent(brand)}`}
                    className="px-3 py-1.5 rounded-full border text-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  >
                    {brand}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* New Products */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <SectionHeader title="Новинки" href="/catalog/new" />
            <ProductsCarousel products={newProducts} />
          </div>
        </section>

        {/* Features */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="flex flex-col md:flex-row items-center md:items-start gap-3 p-4 md:p-5 rounded-xl bg-muted/50 text-center md:text-left"
                >
                  <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <feature.icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base mb-1">{feature.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-10 md:py-14 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 text-balance">
              Нужна помощь в выборе телевизора?
            </h2>
            <p className="text-primary-foreground/80 mb-5 md:mb-6 max-w-2xl mx-auto text-sm md:text-base">
              Наши специалисты помогут подобрать идеальный телевизор под ваши потребности и бюджет. 
              Звоните или пишите в WhatsApp!
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
              {STORE_PHONES.map((phone) => (
                <Button
                  key={phone.tel}
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-primary-foreground/30 text-black hover:bg-primary"
                >
                  <a href={`tel:${phone.tel}`}>{phone.display}</a>
                </Button>
              ))}
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/30 text-black hover:bg-primary">
                <a href={`https://wa.me/${STORE_WHATSAPP_DIGITS}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
