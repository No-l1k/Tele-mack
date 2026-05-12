'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { categoriesApi, productsApi } from '@/lib/api'
import type { Category, Product } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { DescriptionBlocksEditor } from '@/components/admin/description-blocks-editor'
import { resolveMediaUrl } from '@/lib/media'
import { PRODUCT_IMAGE_GUIDELINE } from '@/lib/admin-product-images'
import { normalizeProductSlug, normalizeProductSlugInput } from '@/lib/admin-slug'
import { htmlToText } from '@/lib/rich-text'

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

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [specRows, setSpecRows] = useState<SpecRow[]>([{ id: 'spec-1', key: '', value: '' }])
  const [ratingMode, setRatingMode] = useState<'manual' | 'auto'>('manual')
  const [descriptionHtml, setDescriptionHtml] = useState('')
  const [slug, setSlug] = useState('')
  const [additionalOpen, setAdditionalOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [productResponse, categoriesResponse] = await Promise.all([productsApi.getById(productId).catch(() => null), categoriesApi.getAll().catch(() => null)])
      const loadedProduct = productResponse?.data ?? null
      setProduct(loadedProduct)
      if (loadedProduct) {
        setRatingMode((loadedProduct.ratingMode || 'manual') as 'manual' | 'auto')
        setDescriptionHtml(loadedProduct.description || '')
        setSlug(loadedProduct.slug || '')
        const rows = Object.entries(loadedProduct.specs || {})
          .filter(([key]) => key !== 'images')
          .map(([key, value], idx) => ({
            id: `spec-${idx + 1}`,
            key,
            value: String(value),
          }))
        setSpecRows(rows.length > 0 ? rows : [{ id: 'spec-1', key: '', value: '' }])
      }
      setCategories(categoriesResponse?.data ?? [])
      setIsLoading(false)
    })()
  }, [productId])

  const reloadProduct = async () => {
    const res = await productsApi.getById(productId).catch(() => null)
    if (res?.data) setProduct(res.data)
  }

  const handleUploadPendingFiles = async () => {
    if (!product || images.length === 0) return
    setPhotoBusy(true)
    try {
      await productsApi.uploadImages(String(product.id), images)
      setImages([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      await reloadProduct()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки файлов')
    } finally {
      setPhotoBusy(false)
    }
  }

  const moveImage = async (index: number, delta: -1 | 1) => {
    if (!product) return
    const urls = [...product.images]
    const j = index + delta
    if (j < 0 || j >= urls.length) return
    ;[urls[index], urls[j]] = [urls[j], urls[index]]
    setPhotoBusy(true)
    try {
      await productsApi.reorderImages(String(product.id), urls)
      await reloadProduct()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось изменить порядок')
    } finally {
      setPhotoBusy(false)
    }
  }

  const removeImage = async (url: string) => {
    if (!product) return
    if (!confirm('Удалить это фото? Локальный файл на сервере будет удалён.')) return
    setPhotoBusy(true)
    try {
      await productsApi.deleteImage(String(product.id), url)
      await reloadProduct()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось удалить фото')
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product) return
    if (!htmlToText(descriptionHtml)) {
      toast.error('Заполните описание товара')
      return
    }
    const normalizedSlug = normalizeProductSlug(slug)
    if (!normalizedSlug) {
      toast.error('Укажите ссылку на товар: латиница и дефисы, например canon-eos-r6')
      return
    }
    setIsSaving(true)
    const payload = new FormData(event.currentTarget)
    try {
      const categoryId = Number(payload.get('categoryId') || product.categoryId)
      const specsFromRows = Object.fromEntries(
        specRows
          .map((row) => [row.key.trim(), row.value.trim()] as const)
          .filter(([key, value]) => key.length > 0 && value.length > 0)
      )
      await productsApi.update(product.id, {
        name: String(payload.get('name') || product.name),
        slug: normalizedSlug,
        description: String(payload.get('description') || descriptionHtml || product.description),
        shortDescription: String(payload.get('shortDescription') || product.shortDescription || ''),
        brand: normalizeBrand(String(payload.get('brand') || product.brand)),
        price: Number(payload.get('price') || product.price),
        oldPrice: payload.get('oldPrice') ? Number(payload.get('oldPrice')) : undefined,
        quantity: Number(payload.get('quantity') || product.quantity),
        categoryId,
        categorySlug:
          categories.find((category) => Number(category.id) === categoryId)?.slug || product.categorySlug,
        sku: String(payload.get('sku') || product.sku || '').trim() || undefined,
        gtin: String(payload.get('gtin') || product.gtin || '').trim() || undefined,
        specs: {
          ...specsFromRows,
          ...(product.images.length > 0 ? { images: product.images } : {}),
        },
        isNew: payload.get('isNew') === 'on',
        ratingMode,
        rating: ratingMode === 'manual' ? Number(payload.get('rating') || product.rating) : undefined,
        reviewsCount: ratingMode === 'manual' ? Number(payload.get('reviewsCount') || product.reviewsCount) : undefined,
        stockStatus: String(payload.get('stockStatus') || product.stockStatus || 'in_stock') as 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock',
        inStock: ['in_stock', 'low_stock'].includes(String(payload.get('stockStatus') || product.stockStatus || 'in_stock')),
        warrantyMonths: payload.get('warrantyMonths') ? Number(payload.get('warrantyMonths')) : undefined,
        warrantyType: String(payload.get('warrantyType') || product.warrantyType || '').trim() || undefined,
        serviceInfo: String(payload.get('serviceInfo') || product.serviceInfo || '').trim() || undefined,
        metaTitle: String(payload.get('metaTitle') || product.metaTitle || '').trim() || undefined,
        metaDescription: String(payload.get('metaDescription') || product.metaDescription || '').trim() || undefined,
      })
      toast.success('Товар сохранён')
      router.push('/admin/products')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить товар')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadDescriptionImage = async (file: File): Promise<string> => {
    if (!product) throw new Error('Сначала сохраните товар')
    const response = await productsApi.uploadImages(String(product.id), [file])
    const uploadedUrl = response.data?.[0]
    if (!uploadedUrl) {
      throw new Error('Не удалось загрузить изображение')
    }
    await reloadProduct()
    return uploadedUrl
  }

  const handleDeleteDescriptionImage = async (url: string): Promise<void> => {
    if (!product) return
    await productsApi.deleteImage(String(product.id), url)
    await reloadProduct()
  }

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>
  if (!product) return <p className="text-muted-foreground">Товар не найден</p>

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
      <div className="flex items-center gap-4"><Link href="/admin/products"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><h1 className="text-2xl font-bold">Редактирование товара</h1></div>
      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input name="name" defaultValue={product.name} required />
              <div className="space-y-2">
                <Label htmlFor="product-slug-edit">Ссылка на товар</Label>
                <Input
                  id="product-slug-edit"
                  name="slug"
                  placeholder="canon-eos-r6-mark-iii"
                  required
                  autoComplete="off"
                  value={slug}
                  onChange={(event) => setSlug(normalizeProductSlugInput(event.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Латиница и дефисы, например <span className="font-mono">canon-eos-r6</span>.
                </p>
              </div>
              <Textarea name="shortDescription" defaultValue={product.shortDescription} />
              <input type="hidden" name="description" value={descriptionHtml} />
              <DescriptionBlocksEditor
                value={descriptionHtml}
                onChange={setDescriptionHtml}
                onUploadImageFile={handleUploadDescriptionImage}
                onDeleteImageFile={handleDeleteDescriptionImage}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="brand" defaultValue={product.brand} />
                <select name="categoryId" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={product.categoryId}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
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
              <Input type="number" name="price" defaultValue={product.price} required />
              <Input type="number" name="oldPrice" defaultValue={product.oldPrice} />
              <Input type="number" name="quantity" defaultValue={product.quantity} required />
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
                  <Input type="number" name="rating" defaultValue={product.rating} min={0} max={5} step={0.1} />
                  <Input type="number" name="reviewsCount" defaultValue={product.reviewsCount} min={0} step={1} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Сейчас mode=auto: рейтинг и отзывы рассчитываются автоматически ({product.rating} / {product.reviewsCount}).
                </p>
              )}
              <select
                name="stockStatus"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue={product.stockStatus || 'in_stock'}
              >
                <option value="in_stock">В наличии</option>
                <option value="low_stock">Мало</option>
                <option value="preorder">Под заказ</option>
                <option value="out_of_stock">Нет в наличии</option>
              </select>
              <Input name="sku" placeholder="SKU / артикул" defaultValue={product.sku} />
              <Input type="number" name="warrantyMonths" placeholder="Гарантия, мес" min={0} step={1} defaultValue={product.warrantyMonths} />
              <Input name="warrantyType" placeholder="Тип гарантии (например, официальная)" defaultValue={product.warrantyType} />
              <Textarea name="serviceInfo" placeholder="Сервисные условия / сервисный центр" rows={3} defaultValue={product.serviceInfo} />
              <Collapsible open={additionalOpen} onOpenChange={setAdditionalOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between">
                    Дополнительно (необязательно)
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${additionalOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gtin-edit">Штрихкод GTIN / EAN</Label>
                    <Input id="gtin-edit" name="gtin" placeholder="Необязательно, 8–14 цифр" defaultValue={product.gtin} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-title-edit">Заголовок для поиска (meta title)</Label>
                    <Input id="meta-title-edit" name="metaTitle" placeholder="Необязательно" maxLength={255} defaultValue={product.metaTitle} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-desc-edit">Краткое описание для поиска</Label>
                    <Textarea id="meta-desc-edit" name="metaDescription" placeholder="Необязательно" rows={3} maxLength={500} defaultValue={product.metaDescription} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isNew" defaultChecked={product.isNew} />
                Новинка
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Фото товара</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/30 p-3">{PRODUCT_IMAGE_GUIDELINE}</p>

              {product.images.length > 0 ? (
                <ul className="space-y-2">
                  {product.images.map((src, idx) => (
                    <li
                      key={src}
                      className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-2"
                    >
                      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                        {idx === 0 ? 'Обложка' : `№${idx + 1}`}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(src)}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-md border object-contain bg-muted/40"
                      />
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={photoBusy || idx === 0}
                          onClick={() => moveImage(idx, -1)}
                          aria-label="Выше"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={photoBusy || idx >= product.images.length - 1}
                          onClick={() => moveImage(idx, 1)}
                          aria-label="Ниже"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={photoBusy}
                          onClick={() => removeImage(src)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Фото ещё не загружены.</p>
              )}

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm text-muted-foreground">Добавить файлы с компьютера, затем «Загрузить».</p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={photoBusy}
                  onChange={(event) => setImages(Array.from(event.target.files || []))}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={photoBusy || images.length === 0}
                  onClick={handleUploadPendingFiles}
                >
                  {photoBusy ? 'Подождите…' : 'Загрузить выбранные файлы'}
                </Button>
                {images.length > 0 && (
                  <p className="text-sm text-muted-foreground">Выбрано файлов: {images.length}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSaving || photoBusy}>
            {isSaving ? 'Сохранение...' : 'Сохранить данные товара'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={photoBusy}
            onClick={() => {
              if (!confirm('Это уберёт товар из каталога. Продолжить?')) return
              productsApi
                .delete(product.id)
                .then(() => {
                  toast.success('Товар удалён из каталога')
                  router.push('/admin/products')
                })
                .catch((err: unknown) => {
                  toast.error(err instanceof Error ? err.message : 'Не удалось удалить товар')
                })
            }}
          >
            Удалить товар
          </Button>
        </div>
      </form>
    </div>
  )
}

