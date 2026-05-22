import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/context/cart-context'
import { FavoritesProvider } from '@/context/favorites-context'
import { AuthProvider } from '@/context/auth-context'
import { Toaster } from '@/components/ui/sonner'
import { CookieConsentPopup } from '@/components/common/cookie-consent-popup'
import { siteConfig } from '@/lib/site'
import { fetchPublicSettings } from '@/lib/server-store'
import { buildSiteJsonLdGraph } from '@/lib/json-ld'
import { JsonLdScript } from '@/components/seo/json-ld'
import { YandexMetrikaFromEnv } from '@/components/analytics/yandex-metrika'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'TeleMakc - Интернет-магазин телевизоров и электроники',
    template: '%s | TeleMakc',
  },
  description: 'Купить телевизор в Москве с доставкой. Большой выбор телевизоров Samsung, LG, Sony, TCL. Кронштейны, саундбары, аксессуары. Гарантия, установка.',
  keywords: ['телевизоры', 'купить телевизор', 'Samsung', 'LG', 'OLED', 'QLED', 'кронштейны', 'саундбары', 'Москва'],
  authors: [{ name: 'TeleMakc' }],
  creator: 'TeleMakc',
  publisher: 'TeleMakc',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: 'TeleMakc - Интернет-магазин телевизоров',
    description: 'Купить телевизор в Москве с доставкой. Большой выбор телевизоров Samsung, LG, Sony.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TeleMakc - Интернет-магазин телевизоров',
    description: 'Купить телевизор в Москве с доставкой.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/android-chrome-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const enableVercelAnalytics = process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true'
  const settings = await fetchPublicSettings()
  const siteJsonLd = buildSiteJsonLdGraph({
    name: settings?.name,
    phone: settings?.phone,
    email: settings?.email,
    address: settings?.address,
  })

  return (
    <html lang="ru" data-scroll-behavior="smooth" className={`${inter.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <JsonLdScript data={siteJsonLd} />
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              {children}
              <CookieConsentPopup />
              <Toaster position="top-right" richColors closeButton />
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && enableVercelAnalytics && <Analytics />}
        {process.env.NODE_ENV === 'production' && <YandexMetrikaFromEnv />}
      </body>
    </html>
  )
}
