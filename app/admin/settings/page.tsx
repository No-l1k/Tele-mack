'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { settingsApi, type HeroBanner, type StoreSettings } from '@/lib/api'
import { resolveMinOrderAmountRub } from '@/lib/constants'
import { resolveMediaUrl } from '@/lib/media'
import { Trash2 } from 'lucide-react'

const initialState: StoreSettings = {
  name: '',
  phone: '',
  email: '',
  address: '',
  workingHours: '',
  deliveryInfo: {
    moscowFree: true,
    moscowMinSum: 4000,
    regionCostPerKm: 70,
    deliveryDays: '',
  },
  paymentMethods: {
    cash: true,
    card: true,
    cardSurcharge: 15,
    pickup: true,
  },
  social: {},
  heroBanners: [],
  checkoutServices: [],
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(initialState)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingBanners, setIsUploadingBanners] = useState(false)
  const [isDeletingBanner, setIsDeletingBanner] = useState<string | null>(null)

  const normalizeBanners = (value: StoreSettings['heroBanners']): HeroBanner[] => {
    const list = Array.isArray(value) ? value : []
    return list
      .filter((item): item is HeroBanner => Boolean(item && typeof item.image === 'string' && item.image.trim() !== ''))
      .map((item) => ({ image: item.image, href: item.href || '' }))
  }

  useEffect(() => {
    ;(async () => {
      try {
        const response = await settingsApi.get()
        const data = response.data
        setSettings({
          ...data,
          heroBanners: normalizeBanners(data.heroBanners),
          deliveryInfo: {
            ...data.deliveryInfo,
            moscowMinSum: resolveMinOrderAmountRub(data.deliveryInfo?.moscowMinSum),
          },
        })
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      const response = await settingsApi.update(settings)
      setSettings({ ...response.data, heroBanners: normalizeBanners(response.data.heroBanners) })
    } finally {
      setIsSaving(false)
    }
  }

  const uploadHeroBanners = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      setIsUploadingBanners(true)
      const response = await settingsApi.uploadHeroImages(files)
      setSettings((prev) => ({ ...prev, heroBanners: normalizeBanners(response.data) }))
    } finally {
      setIsUploadingBanners(false)
      event.target.value = ''
    }
  }

  const removeHeroBanner = async (url: string) => {
    try {
      setIsDeletingBanner(url)
      const response = await settingsApi.deleteHeroImage(url)
      setSettings((prev) => ({ ...prev, heroBanners: normalizeBanners(response.data) }))
    } finally {
      setIsDeletingBanner(null)
    }
  }

  const moveHeroBanner = (from: number, to: number) => {
    const current = normalizeBanners(settings.heroBanners)
    if (to < 0 || to >= current.length) return
    const next = [...current]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setSettings((prev) => ({ ...prev, heroBanners: next }))
  }

  const updateHeroBannerHref = (index: number, href: string) => {
    const current = normalizeBanners(settings.heroBanners)
    if (!current[index]) return
    const next = [...current]
    next[index] = { ...next[index], href }
    setSettings((prev) => ({ ...prev, heroBanners: next }))
  }

  const updateCheckoutService = (
    index: number,
    field: 'id' | 'name' | 'price' | 'description' | 'enabled' | 'sortOrder',
    value: string | number | boolean
  ) => {
    setSettings((prev) => {
      const current = Array.isArray(prev.checkoutServices) ? [...prev.checkoutServices] : []
      if (!current[index]) return prev
      current[index] = { ...current[index], [field]: value }
      return { ...prev, checkoutServices: current }
    })
  }

  const addCheckoutService = () => {
    setSettings((prev) => ({
      ...prev,
      checkoutServices: [
        ...(prev.checkoutServices ?? []),
        {
          id: `service-${Date.now()}`,
          name: 'Новая услуга',
          price: 0,
          description: '',
          enabled: true,
          sortOrder: (prev.checkoutServices?.length ?? 0) + 1,
        },
      ],
    }))
  }

  const removeCheckoutService = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      checkoutServices: (prev.checkoutServices ?? []).filter((_, i) => i !== index),
    }))
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Загрузка настроек...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">Управление настройками магазина через API</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основные данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={settings.name} onChange={(event) => setSettings((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <PhoneInput
                value={settings.phone}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, phone: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={settings.email} onChange={(event) => setSettings((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>График</Label>
              <Input value={settings.workingHours} onChange={(event) => setSettings((prev) => ({ ...prev, workingHours: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Адрес</Label>
            <Input value={settings.address} onChange={(event) => setSettings((prev) => ({ ...prev, address: event.target.value }))} />
          </div>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Баннеры главной страницы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-banners-upload">Загрузка фото</Label>
            <Input
              id="hero-banners-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={uploadHeroBanners}
              disabled={isUploadingBanners}
            />
            <p className="text-xs text-muted-foreground">
              Рекомендуемый размер: около 1600x700 (широкий формат). На мобильных баннер автоматически адаптируется.
            </p>
          </div>

          {(settings.heroBanners?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {normalizeBanners(settings.heroBanners).map((banner, index) => (
                <div key={`${banner.image}-${index}`} className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="relative aspect-[21/9] w-full overflow-hidden rounded-md bg-muted/30">
                    <Image
                      src={resolveMediaUrl(banner.image)}
                      alt={`Баннер ${index + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`banner-href-${index}`}>Ссылка при клике</Label>
                    <Input
                      id={`banner-href-${index}`}
                      placeholder="/catalog/televizory или https://example.com"
                      value={banner.href || ''}
                      onChange={(event) => updateHeroBannerHref(index, event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveHeroBanner(index, index - 1)}
                      disabled={index === 0}
                    >
                      Влево
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveHeroBanner(index, index + 1)}
                      disabled={index === (settings.heroBanners?.length ?? 1) - 1}
                    >
                      Вправо
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeHeroBanner(banner.image)}
                      disabled={isDeletingBanner === banner.image}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Баннеры не загружены. Будут использоваться стандартные изображения.</p>
          )}

          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить настройки баннеров'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дополнительные услуги на Checkout</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Общие услуги для всех заказов (кронштейн, расширенная гарантия 2/3 года и т.д.).
            Для телевизоров проверка пикселей, установка и гарантия на 1 год добавляются автоматически
            по каждому ТВ в корзине — их здесь настраивать не нужно.
            После удаления услуги нажмите «Сохранить услуги».
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(settings.checkoutServices?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {settings.checkoutServices?.map((service, index) => (
                <div key={`${service.id}-${index}`} className="rounded-lg border p-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>ID услуги</Label>
                      <Input
                        value={service.id}
                        onChange={(event) => updateCheckoutService(index, 'id', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input
                        value={service.name}
                        onChange={(event) => updateCheckoutService(index, 'name', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Цена</Label>
                      <Input
                        type="number"
                        min={0}
                        value={service.price}
                        onChange={(event) => updateCheckoutService(index, 'price', Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Порядок</Label>
                      <Input
                        type="number"
                        value={service.sortOrder}
                        onChange={(event) => updateCheckoutService(index, 'sortOrder', Number(event.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Описание</Label>
                    <Input
                      value={service.description ?? ''}
                      onChange={(event) => updateCheckoutService(index, 'description', event.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={service.enabled}
                        onChange={(event) => updateCheckoutService(index, 'enabled', event.target.checked)}
                      />
                      Активна
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeCheckoutService(index)}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Пока нет услуг для оформления заказа.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addCheckoutService}>
              Добавить услугу
            </Button>
            <Button onClick={saveSettings} disabled={isSaving}>
              {isSaving ? 'Сохранение...' : 'Сохранить услуги'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
