import type { Metadata } from 'next'
import { getProductByIdOrSlug } from '@/lib/data/catalog'
import { resolveMediaUrl } from '@/lib/media'
import { htmlToText } from '@/lib/rich-text'
import { siteConfig } from '@/lib/site'
import {
  resolveProductSeoDescription,
  resolveProductSeoTitle,
  type ProductSeoInput,
} from '@/lib/product-seo'
import { storePhonesContactLine } from '@/lib/store-contacts'
import { fetchPublicSettings } from '@/lib/server-store'

type ProductLayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: Omit<ProductLayoutProps, 'children'>): Promise<Metadata> {
  const { id } = await params
  let product
  try {
    product = await getProductByIdOrSlug(id)
  } catch {
    product = undefined
  }

  if (!product) {
    return {
      title: 'Товар не найден',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const canonical = `/product/${product.slug}`
  const storeSettings = await fetchPublicSettings()
  const seoInput: ProductSeoInput = {
    name: product.name,
    slug: product.slug,
    price: product.price,
    brand: product.brand,
    categoryName: product.categorySlug,
    storeName: storeSettings?.name || siteConfig.name,
    storePhone: storePhonesContactLine(storeSettings?.phone),
  }
  const seoTitle = resolveProductSeoTitle(
    seoInput,
    product.metaTitle,
    storeSettings?.name || siteConfig.name
  )
  const seoDescription = resolveProductSeoDescription(
    seoInput,
    product.metaDescription,
    storeSettings?.name || siteConfig.name,
    storePhonesContactLine(storeSettings?.phone)
  )
  const descriptionText = htmlToText(
    seoDescription || product.shortDescription || product.description || ''
  )
  const rawImage = product.images[0]
  const resolved = rawImage ? resolveMediaUrl(rawImage) : ''
  const ogImageUrl =
    resolved &&
    (resolved.startsWith('http://') || resolved.startsWith('https://')
      ? resolved
      : `${siteConfig.url}${resolved.startsWith('/') ? resolved : `/${resolved}`}`)

  return {
    title: seoTitle || product.name,
    description: descriptionText,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      url: `${siteConfig.url}${canonical}`,
      title: seoTitle || product.name,
      description: descriptionText,
      images: ogImageUrl ? [{ url: ogImageUrl, alt: product.name }] : undefined,
    },
  }
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return children
}
