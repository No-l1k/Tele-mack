import type { Category, Product } from '@/types'
import { storePhonesContactLine } from '@/lib/store-contacts'
import { fetchPublicSettings } from '@/lib/server-store'
import { siteConfig } from '@/lib/site'
import { buildProductPageJsonLdGraph } from '@/lib/json-ld'
import { JsonLdScript } from '@/components/seo/json-ld'

type ProductPageJsonLdProps = {
  product: Product
  category?: Category | null
}

export async function ProductPageJsonLd({ product, category }: ProductPageJsonLdProps) {
  const settings = await fetchPublicSettings()

  const graph = buildProductPageJsonLdGraph(product, {
    category: category ?? null,
    storeName: settings?.name || siteConfig.name,
    storePhone: storePhonesContactLine(settings?.phone),
  })

  return <JsonLdScript data={graph} />
}
