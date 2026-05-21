import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/feeds/yandex.yml'],
        disallow: [
          '/admin/',
          '/api/',
          '/checkout',
          '/order/',
          '/account/',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}
