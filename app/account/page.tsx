'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { User, Package, Heart, LogOut, Settings, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usersApi } from '@/lib/api'
import type { User as UserType } from '@/types'
import { getSavedOrderAccesses } from '@/lib/order-access'
import { formatRuPhoneMask } from '@/lib/phone'

const menuItems = [
  { href: '/account', label: 'Профиль', icon: User },
  { href: '/account/orders', label: 'Мои заказы', icon: Package },
  { href: '/account/favorites', label: 'Избранное', icon: Heart },
  { href: '/account/settings', label: 'Настройки', icon: Settings },
]

export default function AccountPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const recentOrders = useMemo(() => getSavedOrderAccesses().slice(0, 3), [])
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const meResponse = await usersApi.getMe()
        setUser(meResponse.data)
        setFormData({
          name: meResponse.data.name,
          phone: formatRuPhoneMask(meResponse.data.phone || ''),
          email: meResponse.data.email || '',
        })
      } catch {
        // Guest mode: profile data can be unavailable without auth.
      }
    })()
  }, [])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await usersApi.updateProfile({
        name: formData.name,
        email: formData.email || undefined,
      })
      if (user) {
        setUser({ ...user, ...formData })
      }
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Личный кабинет' },
            ]}
          />

          <h1 className="text-2xl font-bold mt-6 mb-8">Личный кабинет</h1>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <nav className="space-y-1">
                    {menuItems.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                    <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors w-full text-destructive">
                      <LogOut className="h-5 w-5" />
                      <span>Выйти</span>
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Profile */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Личные данные</CardTitle>
                    <CardDescription>
                      Управляйте своими контактными данными
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Редактировать
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Имя</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Телефон</Label>
                      <PhoneInput
                        id="phone"
                        value={formData.phone}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="flex gap-3 mt-6">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Отмена
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent orders */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Последние заказы</CardTitle>
                    <CardDescription>
                      История ваших покупок
                    </CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/account/orders">Все заказы</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentOrders.length > 0 ? (
                    <div className="space-y-4">
                      {recentOrders.map(order => (
                        <Link
                          key={order.orderId}
                          href={`/order/${order.orderId}?token=${encodeURIComponent(order.token)}`}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <div className="font-medium">Заказ № {order.orderNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString('ru-RU')}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">На этом устройстве пока нет сохраненных заказов</p>
                      <Button asChild className="mt-4">
                        <Link href="/orders">Найти заказ по номеру</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
