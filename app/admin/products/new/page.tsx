'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { categoriesApi, productsApi } from '@/lib/api'
import type { Category } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PRODUCT_IMAGE_GUIDELINE } from '@/lib/admin-product-images'

type SpecRow = {
  id: string
  key: string
  value: string
}

const normalizeBrand = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ')

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [ratingMode, setRatingMode] = useState<'manual' | 'auto'>('manual')
  const [isLoading, setIsLoading] = useState(false)
  const [specRows, setSpecRows] = useState<SpecRow[]>([{ id: 'spec-1', key: '', value: '' }])

  useEffect(() => {
    ;(async () => {
      const response = await categoriesApi.getAll().catch(() => null)
      setCategories(response?.data ?? [])
    })()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const payload = new FormData(event.currentTarget)
    const specs = Object.fromEntries(
      specRows
        .map((row) => [row.key.trim(), row.value.trim()] as const)
        .filter(([key, value]) => key.length > 0 && value.length > 0)
    )
    try {
      const response = await productsApi.create({
        name: String(payload.get('name') || ''),
        slug: String(payload.get('slug') || ''),
        description: String(payload.get('description') || ''),
        shortDescription: String(payload.get('shortDescription') || ''),
        price: Number(payload.get('price') || 0),
        oldPrice: payload.get('oldPrice') ? Number(payload.get('oldPrice')) : undefined,
        categoryId: Number(categoryId),
        categorySlug: categories.find((category) => category.id === categoryId)?.slug || '',
        brand: normalizeBrand(String(payload.get('brand') || '')),
        sku: String(payload.get('sku') || '').trim() || undefined,
        gtin: String(payload.get('gtin') || '').trim() || undefined,
        specs,
        inStock: ['in_stock', 'low_stock'].includes(String(payload.get('stockStatus') || 'in_stock')),
        stockStatus: String(payload.get('stockStatus') || 'in_stock') as 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock',
        quantity: Number(payload.get('quantity') || 0),
        isNew: payload.get('isNew') === 'on',
        ratingMode,
        rating: ratingMode === 'manual' ? Number(payload.get('rating') || 4.8) : undefined,
        reviewsCount: ratingMode === 'manual' ? Number(payload.get('reviewsCount') || 0) : undefined,
        warrantyMonths: payload.get('warrantyMonths') ? Number(payload.get('warrantyMonths')) : undefined,
        warrantyType: String(payload.get('warrantyType') || '').trim() || undefined,
        serviceInfo: String(payload.get('serviceInfo') || '').trim() || undefined,
        metaTitle: String(payload.get('metaTitle') || '').trim() || undefined,
        metaDescription: String(payload.get('metaDescription') || '').trim() || undefined,
        images: [],
      })
      if (images.length > 0) {
        await productsApi.uploadImages(response.data.id, images)
      }
      router.push('/admin/products')
    } finally {
      setIsLoading(false)
    }
  }

  const addSpecRow = () => {
    setSpecRows((prev) => [...prev, { id: `spec-${Date.now()}`, key: '', value: '' }])
  }

  const updateSpecRow = (id: string, field: 'key' | 'value', nextValue: string) => {
    setSpecRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: nextValue } : row)))
  }

  const removeSpecRow = (id: string) => {
    setSpecRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [{ id: 'spec-1', key: '', value: '' }]))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">Новый товар</h1>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input name="name" placeholder="Название" required />
              <Input name="slug" placeholder="Slug" required />
              <Textarea name="shortDescription" placeholder="Короткое описание" />
              <Textarea name="description" placeholder="Описание" rows={5} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="brand" placeholder="Бренд" />
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
                  <option value="">Категория</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Характеристики</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addSpecRow}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {specRows.map((row) => (
                <div key={row.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="Название характеристики"
                    value={row.key}
                    onChange={(event) => updateSpecRow(row.id, 'key', event.target.value)}
                  />
                  <Input
                    placeholder="Значение"
                    value={row.value}
                    onChange={(event) => updateSpecRow(row.id, 'value', event.target.value)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSpecRow(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Цена и остатки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="number" name="price" placeholder="Цена" required />
              <Input type="number" name="oldPrice" placeholder="Старая цена" />
              <Input type="number" name="quantity" placeholder="Количество" required />
              <select name="stockStatus" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="in_stock">
                <option value="in_stock">В наличии</option>
                <option value="low_stock">Мало</option>
                <option value="preorder">Под заказ</option>
                <option value="out_of_stock">Нет в наличии</option>
              </select>
              <select
                name="ratingMode"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={ratingMode}
                onChange={(event) => setRatingMode(event.target.value as 'manual' | 'auto')}
              >
                <option value="manual">Рейтинг вручную (manual)</option>
                <option value="auto">Рейтинг из отзывов (auto)</option>
              </select>
              {ratingMode === 'manual' ? (
                <>
                  <Input type="number" name="rating" placeholder="Рейтинг (0-5)" min={0} max={5} step={0.1} defaultValue={4.8} />
                  <Input type="number" name="reviewsCount" placeholder="Количество отзывов" min={0} step={1} defaultValue={0} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  В режиме auto рейтинг и количество отзывов считаются автоматически по одобренным отзывам.
                </p>
              )}
              <Input name="sku" placeholder="SKU / артикул" />
              <Input name="gtin" placeholder="GTIN / EAN (8/12/13/14 цифр)" />
              <Input type="number" name="warrantyMonths" placeholder="Гарантия, мес" min={0} step={1} />
              <Input name="warrantyType" placeholder="Тип гарантии (например, официальная)" />
              <Textarea name="serviceInfo" placeholder="Сервисные условия / сервисный центр" rows={3} />
              <Input name="metaTitle" placeholder="Meta title" maxLength={255} />
              <Textarea name="metaDescription" placeholder="Meta description" rows={3} maxLength={500} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isNew" />
                Новинка
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Фото</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/30 p-3">{PRODUCT_IMAGE_GUIDELINE}</p>
              <Input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImages(Array.from(event.target.files || []))}
              />
              <p className="text-xs text-muted-foreground">
                После создания товара можно изменить порядок и удалить лишние фото в редактировании.
              </p>
            </CardContent>
          </Card>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Создать товар'}
          </Button>
        </div>
      </form>
    </div>
  )
}

