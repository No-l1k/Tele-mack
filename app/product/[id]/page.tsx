import { notFound, permanentRedirect } from 'next/navigation'
import {
  getCategoryBySlug,
  getProductByIdOrSlug,
  getProductVariants,
  getProductsByCategory,
  getProductsByIds,
} from '@/lib/data/catalog'
import { productPagePath, shouldRedirectProductSegmentToSlug } from '@/lib/product-path'
import { ProductPageJsonLd } from '@/components/seo/product-page-json-ld'
import ProductPageClient from './product-page-client'

type ProductPageProps = {
  params: Promise<{ id: string }>
}

/** Не кэшировать оболочку страницы — иначе curl/робот может получить 200 без товара. */
export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params

  const product = await getProductByIdOrSlug(id)
  if (product && shouldRedirectProductSegmentToSlug(id, product.slug)) {
    permanentRedirect(productPagePath(product.slug))
  }
  if (!product) {
    notFound()
  }

  const [category, accessories, related, variants] = await Promise.all([
    getCategoryBySlug(product.categorySlug),
    getProductsByIds(product.recommendedAccessoryIds ?? []),
    getProductsByCategory(product.categorySlug, 8),
    getProductVariants(product.id),
  ])

  return (
    <>
      <ProductPageJsonLd product={product} category={category} />
      <ProductPageClient
        initialProduct={product}
        initialCategory={category}
        initialRecommendedAccessories={accessories.filter((item) => item.id !== product.id)}
        initialRelatedProducts={related.filter((item) => item.id !== product.id).slice(0, 4)}
        initialVariantProducts={variants}
      />
    </>
  )
}
