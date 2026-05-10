import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/context/cart-context'
import { FavoritesProvider } from '@/context/favorites-context'
import { AuthProvider } from '@/context/auth-context'
import { Toaster } from '@/components/ui/sonner'
import { CookieConsentPopup } from '@/components/common/cookie-consent-popup'
import { siteConfig } from '@/lib/site'
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
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: '32x32' }],
    shortcut: '/favicon.png',
    apple: '/apple-icon.png',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const enableVercelAnalytics = process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true'
  return (
    <html lang="ru" data-scroll-behavior="smooth" className={`${inter.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
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
      </body>
    </html>
  )
}
