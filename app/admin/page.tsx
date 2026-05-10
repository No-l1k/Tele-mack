'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatDate } from '@/lib/formatters'
import { dashboardApi, ordersApi, productsApi } from '@/lib/api'
import type { DashboardStats, Order, Product } from '@/types'
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Принят',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [popularProducts, setPopularProducts] = useState<Product[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, ordersRes, popularRes] = await Promise.all([
          dashboardApi.getStats(),
          ordersApi.getAll({ page: 1, pageSize: 5 }),
          productsApi.getPopular(5),
        ])
        setStats(statsRes.data)
        setRecentOrders(ordersRes.data)
        setPopularProducts(popularRes.data)
      } catch (error) {
        console.error('Failed to load admin dashboard data', error)
      }
    }
    load()
  }, [])

  const statCards = [
    {
      name: 'Выручка',
      value: formatPrice(stats?.totalRevenue || 0),
      change: `Сегодня: ${formatPrice(stats?.revenueToday || 0)}`,
      icon: TrendingUp,
    },
    {
      name: 'Заказов',
      value: String(stats?.totalOrders || 0),
      change: `Сегодня: ${stats?.ordersToday || 0}`,
      icon: ShoppingCart,
    },
    {
      name: 'Товаров',
      value: String(stats?.totalProducts || 0),
      change: `В ожидании: ${stats?.pendingOrders || 0}`,
      icon: Package,
    },
    {
      name: 'Пользователей',
      value: String(stats?.totalUsers || 0),
      change: 'Актуальные данные',
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground">
          Обзор показателей магазина TeleMakc
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {stat.change}
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Последние заказы</CardTitle>
              <CardDescription>Новые заказы за сегодня</CardDescription>
            </div>
            <Link href="/admin/orders">
              <Button variant="outline" size="sm">
                Все заказы
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">Заказ #{order.number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer.name} - {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(order.total)}</p>
                    <Badge className={statusColors[order.status]} variant="secondary">
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Популярные товары</CardTitle>
              <CardDescription>Самые продаваемые за неделю</CardDescription>
            </div>
            <Link href="/admin/products">
              <Button variant="outline" size="sm">
                Все товары
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.categorySlug}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(product.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.reviewsCount} отзывов
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/products/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Package className="h-4 w-4" />
                Добавить товар
              </Button>
            </Link>
            <Link href="/admin/orders?status=pending">
              <Button variant="outline" className="w-full justify-start gap-2">
                <ShoppingCart className="h-4 w-4" />
                Новые заказы
              </Button>
            </Link>
            <Link href="/admin/reviews?status=pending">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Eye className="h-4 w-4" />
                Модерация отзывов
              </Button>
            </Link>
            <Link href="/" target="_blank">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Eye className="h-4 w-4" />
                Открыть сайт
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
