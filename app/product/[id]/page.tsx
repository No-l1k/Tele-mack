import { notFound, permanentRedirect } from 'next/navigation'
import {
  getCategoryBySlug,
  getProductByIdOrSlug,
  getProductsByCategory,
  getProductsByIds,
} from '@/lib/data/catalog'
import { productPagePath, shouldRedirectProductSegmentToSlug } from '@/lib/product-path'
import { ProductPageJsonLd } from '@/components/seo/product-page-json-ld'
import ProductPageClient from './product-page-client'

type ProductPageProps = {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params

  try {
    const product = await getProductByIdOrSlug(id)
    if (product && shouldRedirectProductSegmentToSlug(id, product.slug)) {
      permanentRedirect(productPagePath(product.slug))
    }
    if (!product) {
      notFound()
    }

    const [category, accessories, related] = await Promise.all([
      getCategoryBySlug(product.categorySlug),
      getProductsByIds(product.recommendedAccessoryIds ?? []),
      getProductsByCategory(product.categorySlug, 8),
    ])

    return (
      <>
        <ProductPageJsonLd product={product} category={category} />
        <ProductPageClient
          initialProduct={product}
          initialCategory={category}
          initialRecommendedAccessories={accessories.filter((item) => item.id !== product.id)}
          initialRelatedProducts={related.filter((item) => item.id !== product.id).slice(0, 4)}
          initialHasError={false}
        />
      </>
    )
  } catch {
    return (
      <ProductPageClient
        initialProduct={undefined}
        initialCategory={undefined}
        initialRecommendedAccessories={[]}
        initialRelatedProducts={[]}
        initialHasError={true}
      />
    )
  }
}
