'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { dashboardApi } from '@/lib/api'
import { formatPrice } from '@/lib/formatters'
import type { DashboardStats, Product, Category } from '@/types'

type AnalyticsPayload = {
  revenue: { date: string; amount: number }[]
  orders: { date: string; count: number }[]
  topProducts: { product: Product; soldCount: number }[]
  topCategories: { category: Category; revenue: number }[]
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        setIsLoading(true)
        const [statsRes, analyticsRes] = await Promise.all([dashboardApi.getStats(), dashboardApi.getAnalytics(period)])
        setStats(statsRes.data)
        setAnalytics(analyticsRes.data)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [period])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <Select value={period} onValueChange={(value) => setPeriod(value as 'week' | 'month' | 'year')}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Неделя</SelectItem>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="year">Год</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading && <p className="text-muted-foreground">Загрузка...</p>}
      {!isLoading && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm">Выручка</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Заказы</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalOrders}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Пользователи</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalUsers}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Товары</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalProducts}</CardContent></Card>
        </div>
      )}
      {!isLoading && analytics && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Топ товаров</CardTitle></CardHeader>
            <CardContent className="space-y-2">{analytics.topProducts.map((item) => <div key={item.product.id} className="flex items-center justify-between text-sm"><span>{item.product.name}</span><span className="text-muted-foreground">{item.soldCount}</span></div>)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Топ категорий</CardTitle></CardHeader>
            <CardContent className="space-y-2">{analytics.topCategories.map((item) => <div key={item.category.id} className="flex items-center justify-between text-sm"><span>{item.category.name}</span><span className="text-muted-foreground">{formatPrice(item.revenue)}</span></div>)}</CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

