'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Star,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Tags,
  MessageSquare,
  BarChart3,
} from 'lucide-react'

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Категории', href: '/admin/categories', icon: Tags },
  { name: 'Заказы', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Пользователи', href: '/admin/users', icon: Users },
  { name: 'Отзывы', href: '/admin/reviews', icon: MessageSquare },
  { name: 'Аналитика', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, isAdmin, isLoading } = useAuth()
  const isLoginPage = pathname.startsWith('/admin/login')
  const isOrderReceiptPrint = /^\/admin\/orders\/[^/]+\/print\/?$/.test(pathname)
  const [hasStoredAdmin, setHasStoredAdmin] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      const stored = raw ? JSON.parse(raw) : null
      setHasStoredAdmin(stored?.role === 'admin' && Boolean(localStorage.getItem('auth_token')))
    } catch {
      setHasStoredAdmin(false)
    }
  }, [isAdmin, user])

  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAdmin && !hasStoredAdmin) {
      router.replace('/admin/login')
    }
  }, [hasStoredAdmin, isAdmin, isLoading, isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (isLoading || (!isAdmin && hasStoredAdmin)) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Проверяем доступ...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  if (isOrderReceiptPrint) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">TeleMakc</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              Админ
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={() => {
              logout()
              window.location.href = '/'
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Выйти на сайт
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-card border-b flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">А</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.name || 'Администратор'}</p>
                <p className="text-xs text-muted-foreground">{user?.phone || user?.email || ''}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
