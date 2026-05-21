'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Search, User, ShoppingCart, Menu, X, Heart } from 'lucide-react'
import { StorePhones } from '@/components/layout/store-phones'
import { STORE_WHATSAPP_DIGITS } from '@/lib/store-contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { MegaMenu } from './mega-menu'
import { useCart } from '@/context/cart-context'
import { useFavorites } from '@/context/favorites-context'
import { categoriesApi, productsApi } from '@/lib/api'
import type { Category } from '@/types'

const navLinks = [
  { href: '/account', label: 'Личный кабинет' },
  { href: '/delivery', label: 'Доставка и оплата' },
  { href: '/services', label: 'Услуги' },
  { href: '/contacts', label: 'Контакты' },
]

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const { itemsCount } = useCart()
  const { favoritesCount } = useFavorites()

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const [categoriesResponse, brandsResponse] = await Promise.all([
          categoriesApi.getTree(),
          productsApi.getBrands(18).then((res) => res.data),
        ])
        if (!cancelled) {
          setCategories(
            categoriesResponse.data.filter((category) => !category.parentId && category.showOnHome)
          )
          setBrands(brandsResponse)
        }
      } catch {
        if (!cancelled) {
          setCategories([])
          setBrands([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b">
      {/* Top bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-10 text-sm">
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4 ml-auto">
              <StorePhones
                compact
                showIcon
                linkClassName="text-muted-foreground hover:text-foreground"
              />
              <span className="hidden sm:inline text-muted-foreground">|</span>
              <a
                href="mailto:tele-makc@yandex.ru"
                className="hidden sm:inline text-muted-foreground hover:text-foreground transition-colors"
              >
                tele-makc@yandex.ru
              </a>
              <a
                href={`https://wa.me/${STORE_WHATSAPP_DIGITS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-green-600 hover:text-green-700 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          {/* Mobile menu button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Меню</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetTitle className="sr-only">Меню навигации</SheetTitle>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <Link href="/" className="text-xl font-bold text-primary" onClick={() => setIsMobileMenuOpen(false)}>
                    TeleMakc
                  </Link>
                </div>
                <nav className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {categories.map(category => (
                      <Link
                        key={category.id}
                        href={`/catalog/${category.slug}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>{category.name}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t space-y-1">
                    {navLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </nav>
                <div className="p-4 border-t">
                  <StorePhones
                    variant="stack"
                    compact
                    showIcon
                    linkClassName="text-muted-foreground"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-2xl font-bold text-primary">TeleMakc</span>
          </Link>

          {/* Catalog button */}
          <div className="relative hidden md:block">
            <Button
              variant="default"
              className="gap-2"
              onMouseEnter={() => setIsMegaMenuOpen(true)}
              onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
            >
              {isMegaMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              Каталог
            </Button>
            {isMegaMenuOpen && (
              <MegaMenu categories={categories} brands={brands} onClose={() => setIsMegaMenuOpen(false)} />
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:flex">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Поиск</span>
              </Button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="hidden lg:flex" disabled title="Скоро будет доступно">
              <span className="sr-only">Сравнение</span>
            </Button>
            
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/account">
                <User className="h-5 w-5" />
                <span className="sr-only">Профиль</span>
              </Link>
            </Button>

            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/account/favorites">
                <Heart className="h-5 w-5" />
                {favoritesCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {favoritesCount}
                  </Badge>
                )}
                <span className="sr-only">Избранное</span>
              </Link>
            </Button>

            <Button variant="outline" className="gap-2 ml-2" asChild>
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                <span className="hidden sm:inline">Корзина</span>
                {itemsCount > 0 && (
                  <Badge className="ml-1">{itemsCount}</Badge>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Categories nav */}
      <div className="border-t hidden lg:block" onMouseLeave={() => setIsMegaMenuOpen(false)}>
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-thin">
            {categories.map(category => (
              <Link
                key={category.id}
                href={`/catalog/${category.slug}`}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden border-t px-4 py-2">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Input
              type="search"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </header>
  )
}
