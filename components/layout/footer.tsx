'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { StorePhones } from '@/components/layout/store-phones'
import { categoriesApi } from '@/lib/api'
import type { Category } from '@/types'

const footerLinks = {
  catalog: {
    title: 'TeleMakc',
    links: [
      { href: '/catalog/new', label: 'Новинки' },
      { href: '/catalog/televizory', label: 'Телевизоры' },
      { href: '/catalog/kronshteyny', label: 'Кронштейны' },
      { href: '/catalog/saundbary', label: 'Саундбары' },
    ],
  },
  customer: {
    title: 'Клиентам',
    links: [
      { href: '/account', label: 'Личный кабинет' },
      { href: '/orders', label: 'Проверить заказ' },
      { href: '/delivery', label: 'Доставка и оплата' },
      { href: '/services', label: 'Услуги' },
      { href: '/contacts', label: 'Контакты' },
    ],
  },
  info: {
    title: 'Информация',
    links: [
      { href: '/cart', label: 'Корзина' },
      { href: '/services', label: 'Услуги' },
      { href: '/warranty', label: 'Гарантии' },
    ],
  },
}

export function Footer() {
  const [homeCategories, setHomeCategories] = useState<Category[]>([])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const response = await categoriesApi.getTree()
        if (!cancelled) {
          setHomeCategories(
            response.data.filter((category) => !category.parentId && category.showOnHome)
          )
        }
      } catch {
        if (!cancelled) {
          setHomeCategories([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand and contacts */}
          <div className="col-span-2 md:col-span-1 space-y-3 md:space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-xl md:text-2xl font-bold">TELE-MAKC</span>
            </Link>
            <div className="space-y-2 text-sm text-background/70">
              <StorePhones
                variant="stack"
                compact
                showIcon
                linkClassName="hover:text-background"
              />
              <div className="text-xs">интернет-магазин</div>
            </div>
          </div>

          {/* Catalog links */}
          <div>
            <h3 className="font-semibold text-sm md:text-base mb-3 md:mb-4">{footerLinks.catalog.title}</h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:gap-y-2 text-xs md:text-sm text-background/70">
              {homeCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/catalog/${category.slug}`}
                    className="hover:text-background transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer links */}
          <div>
            <h3 className="font-semibold text-sm md:text-base mb-3 md:mb-4">{footerLinks.customer.title}</h3>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-background/70">
              {footerLinks.customer.links.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div>
            <h3 className="font-semibold text-sm md:text-base mb-3 md:mb-4">{footerLinks.info.title}</h3>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-background/70">
              {footerLinks.info.links.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-xs md:text-sm text-background/50">
          <p>&copy; {new Date().getFullYear()} TeleMakc. Все права защищены.</p>
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/privacy" className="hover:text-background transition-colors">
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
