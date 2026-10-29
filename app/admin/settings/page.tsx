'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { HeroBannersEditor } from '@/components/admin/hero-banners-editor'
import { settingsApi, type HeroBanner, type StoreSettings } from '@/lib/api'
import { resolveMinOrderAmountRub } from '@/lib/constants'
import {
  bannersEqual,
  isValidHeroHref,
  normalizeHeroBanners,
  toHeroBannersPayload,
} from '@/lib/hero-banners'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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

type SavingSection = 'general' | 'banners' | 'services' | null

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(initialState)
  const [savedBanners, setSavedBanners] = useState<HeroBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingSection, setSavingSection] = useState<SavingSection>(null)
  const [isUploadingBanners, setIsUploadingBanners] = useState(false)
  const [isDeletingBanner, setIsDeletingBanner] = useState<string | null>(null)

  const banners = useMemo(() => normalizeHeroBanners(settings.heroBanners), [settings.heroBanners])
  const bannersDirty = !bannersEqual(banners, savedBanners)
  const hasInvalidBannerHref = banners.some((banner) => !isValidHeroHref(banner.href || ''))
  const bannersBusy = savingSection !== null || isUploadingBanners || isDeletingBanner !== null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await settingsApi.get()
        if (cancelled) return
        const data = response.data
        const nextBanners = normalizeHeroBanners(data.heroBanners)
        setSettings({
          ...data,
          heroBanners: nextBanners,
          deliveryInfo: {
            ...data.deliveryInfo,
            moscowMinSum: resolveMinOrderAmountRub(data.deliveryInfo?.moscowMinSum),
          },
        })
        setSavedBanners(nextBanners)
        setLoadError(null)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Не удалось загрузить настройки'
        setLoadError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistBannersIfDirty = async (): Promise<HeroBanner[]> => {
    if (!bannersDirty) return banners
    if (hasInvalidBannerHref) {
      throw new Error('Исправьте ссылки баннеров перед загрузкой или удалением')
    }
    const response = await settingsApi.update({ heroBanners: toHeroBannersPayload(banners) })
    const nextBanners = normalizeHeroBanners(response.data.heroBanners)
    setSettings((prev) => ({ ...prev, heroBanners: nextBanners }))
    setSavedBanners(nextBanners)
    return nextBanners
  }

  const saveGeneral = async () => {
    try {
      setSavingSection('general')
      const response = await settingsApi.update({
        name: settings.name,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        workingHours: settings.workingHours,
      })
      const nextBanners = normalizeHeroBanners(response.data.heroBanners)
      setSettings({
        ...response.data,
        heroBanners: bannersDirty ? banners : nextBanners,
        deliveryInfo: {
          ...response.data.deliveryInfo,
          moscowMinSum: resolveMinOrderAmountRub(response.data.deliveryInfo?.moscowMinSum),
        },
      })
      if (!bannersDirty) setSavedBanners(nextBanners)
      toast.success('Основные данные сохранены')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить настройки')
    } finally {
      setSavingSection(null)
    }
  }

  const saveBanners = async () => {
    if (hasInvalidBannerHref) {
      toast.error('Исправьте ссылки баннеров')
      return
    }
    try {
      setSavingSection('banners')
      const response = await settingsApi.update({ heroBanners: toHeroBannersPayload(banners) })
      const nextBanners = normalizeHeroBanners(response.data.heroBanners)
      setSettings((prev) => ({ ...prev, heroBanners: nextBanners }))
      setSavedBanners(nextBanners)
      toast.success('Настройки баннеров сохранены')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить баннеры')
    } finally {
      setSavingSection(null)
    }
  }

  const saveServices = async () => {
    try {
      setSavingSection('services')
      const response = await settingsApi.update({ checkoutServices: settings.checkoutServices })
      const nextBanners = normalizeHeroBanners(response.data.heroBanners)
      setSettings({
        ...response.data,
        heroBanners: bannersDirty ? banners : nextBanners,
        deliveryInfo: {
          ...response.data.deliveryInfo,
          moscowMinSum: resolveMinOrderAmountRub(response.data.deliveryInfo?.moscowMinSum),
        },
      })
      if (!bannersDirty) setSavedBanners(nextBanners)
      toast.success('Услуги сохранены')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить услуги')
    } finally {
      setSavingSection(null)
    }
  }

  const applyBannerList = (nextBanners: HeroBanner[]) => {
    setSettings((prev) => ({ ...prev, heroBanners: nextBanners }))
    setSavedBanners(nextBanners)
  }

  const uploadHeroBanners = async (files: File[]) => {
    if (!files.length) return
    try {
      setIsUploadingBanners(true)
      await persistBannersIfDirty()
      const response = await settingsApi.uploadHeroImages(files)
      applyBannerList(normalizeHeroBanners(response.data))
      toast.success(files.length === 1 ? 'Баннер загружен' : `Загружено баннеров: ${files.length}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить баннеры')
    } finally {
      setIsUploadingBanners(false)
    }
  }

  const replaceHeroBannerImage = async (banner: HeroBanner, slot: 'desktop' | 'mobile', file: File) => {
    try {
      setIsUploadingBanners(true)
      const latest = await persistBannersIfDirty()
      const current = latest.find((item) => item.id === banner.id || item.image === banner.image) ?? banner
      const response = await settingsApi.uploadHeroImages([file], { bannerId: current.id, slot })
      applyBannerList(normalizeHeroBanners(response.data))
      toast.success(slot === 'mobile' ? 'Мобильное фото обновлено' : 'Основное фото обновлено')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось заменить изображение')
    } finally {
      setIsUploadingBanners(false)
    }
  }

  const removeHeroBanner = async (banner: HeroBanner) => {
    if (!confirm('Удалить этот слайд? Файлы на сервере будут удалены.')) return
    try {
      setIsDeletingBanner(banner.id)
      await persistBannersIfDirty()
      const response = await settingsApi.deleteHeroImage(banner.image)
      applyBannerList(normalizeHeroBanners(response.data))
      toast.success('Баннер удалён')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить баннер')
    } finally {
      setIsDeletingBanner(null)
    }
  }

  const removeHeroBannerMobile = async (banner: HeroBanner) => {
    if (!banner.mobileImage) return
    if (!confirm('Убрать мобильное фото? Файл на сервере будет удалён.')) return
    try {
      setIsDeletingBanner(`${banner.id}:mobile`)
      const latest = await persistBannersIfDirty()
      const current = latest.find((item) => item.id === banner.id || item.image === banner.image) ?? banner
      if (!current.mobileImage) return
      const response = await settingsApi.deleteHeroImage(current.mobileImage)
      applyBannerList(normalizeHeroBanners(response.data))
      toast.success('Мобильное фото удалено')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить мобильное фото')
    } finally {
      setIsDeletingBanner(null)
    }
  }

  const moveHeroBanner = (from: number, to: number) => {
    if (to < 0 || to >= banners.length || from === to) return
    const next = [...banners]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setSettings((prev) => ({ ...prev, heroBanners: next }))
  }

  const patchHeroBanner = (index: number, patch: Partial<HeroBanner>) => {
    if (!banners[index]) return
    const next = [...banners]
    next[index] = { ...next[index], ...patch }
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

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Не удалось загрузить настройки.</p>
        <p className="text-sm text-red-600">{loadError}</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Повторить
        </Button>
      </div>
    )
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
          <Button onClick={saveGeneral} disabled={savingSection !== null}>
            {savingSection === 'general' ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Баннеры главной страницы</CardTitle>
        </CardHeader>
        <CardContent>
          <HeroBannersEditor
            banners={banners}
            dirty={bannersDirty}
            busy={bannersBusy}
            deletingKey={isDeletingBanner}
            hasInvalidHref={hasInvalidBannerHref}
            saving={savingSection === 'banners'}
            onUpload={uploadHeroBanners}
            onReplace={replaceHeroBannerImage}
            onDeleteBanner={removeHeroBanner}
            onDeleteMobile={removeHeroBannerMobile}
            onMove={moveHeroBanner}
            onPatch={patchHeroBanner}
            onSave={saveBanners}
          />
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
            <Button onClick={saveServices} disabled={savingSection !== null}>
              {savingSection === 'services' ? 'Сохранение...' : 'Сохранить услуги'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
