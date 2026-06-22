'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
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
import {
  DescriptionBlocksEditor,
  type DescriptionBlocksEditorHandle,
} from '@/components/admin/description-blocks-editor'
import { ProductSpecsEditor, type SpecRow } from '@/components/admin/product-specs-editor'
import { ProductCategoriesEditor } from '@/components/admin/product-categories-editor'
import { resolveMediaUrl } from '@/lib/media'
import { PRODUCT_IMAGE_GUIDELINE } from '@/lib/admin-product-images'
import { normalizeProductSlug, normalizeProductSlugInput } from '@/lib/admin-slug'
import { htmlToText } from '@/lib/rich-text'
import { ProductSeoDialog } from '@/components/admin/product-seo-dialog'
import { readProductSeoFromForm } from '@/components/admin/read-product-seo-form'
import {
  buildProductSeoPreview,
  normalizeMetaDescriptionForSave,
  normalizeMetaTitleForSave,
  type ProductSeoInput,
} from '@/lib/product-seo'

const normalizeBrand = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ')

async function loadCatalogProducts(): Promise<Product[]> {
  const allProducts: Product[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await productsApi.getAll(undefined, page, 100)
    allProducts.push(...response.data)
    totalPages = response.totalPages || 1
    page += 1
  }

  return allProducts
}

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([])
  const [recommendedAccessoryIds, setRecommendedAccessoryIds] = useState<string[]>([])
  const [accessoriesSearch, setAccessoriesSearch] = useState('')
  const [images, setImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [specRows, setSpecRows] = useState<SpecRow[]>([{ id: 'spec-1', key: '', value: '' }])
  const [ratingMode, setRatingMode] = useState<'manual' | 'auto'>('manual')
  const [descriptionHtml, setDescriptionHtml] = useState('')
  const [serviceInfoHtml, setServiceInfoHtml] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([])
  const [additionalOpen, setAdditionalOpen] = useState(false)
  const [seoOpen, setSeoOpen] = useState(false)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [seoFormTick, setSeoFormTick] = useState(0)
  const [variantGroup, setVariantGroup] = useState('')
  const serviceInfoEditorRef = useRef<DescriptionBlocksEditorHandle>(null)

  useEffect(() => {
    ;(async () => {
      const [productResponse, categoriesResponse, products] = await Promise.all([
        productsApi.getById(productId).catch(() => null),
        categoriesApi.getAll().catch(() => null),
        loadCatalogProducts().catch(() => []),
      ])
      const loadedProduct = productResponse?.data ?? null
      setProduct(loadedProduct)
      setCatalogProducts(products.map((item) => ({ ...item, id: String(item.id) })))
      if (loadedProduct) {
        setRatingMode((loadedProduct.ratingMode || 'manual') as 'manual' | 'auto')
        setDescriptionHtml(loadedProduct.description || '')
        setServiceInfoHtml(loadedProduct.serviceInfo || '')
        setSlug(loadedProduct.slug || '')
        setCategoryId(String(loadedProduct.categoryId || ''))
        setAdditionalCategoryIds(
          (loadedProduct.categoryIds ?? [])
            .map((id) => String(id))
            .filter((id) => id !== String(loadedProduct.categoryId)),
        )
        setVariantGroup(loadedProduct.variantGroup || '')
        setRecommendedAccessoryIds((loadedProduct.recommendedAccessoryIds ?? []).map((id) => String(id)))
        const rows = Object.entries(loadedProduct.specs || {})
          .filter(([key]) => key !== 'images')
          .map(([key, value], idx) => ({
            id: `spec-${idx + 1}`,
            key,
            value: String(value),
          }))
        setSpecRows(rows.length > 0 ? rows : [{ id: 'spec-1', key: '', value: '' }])
        setMetaTitle(loadedProduct.metaTitle || '')
        setMetaDescription(loadedProduct.metaDescription || '')
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
    const selectedCategoryId = Number(categoryId || payload.get('categoryId') || product.categoryId)
    const selectedCategory =
      categories.find((category) => String(category.id) === String(selectedCategoryId)) ?? null
    const seoInputForSave = readProductSeoFromForm('product-edit-form', {
      name: String(payload.get('name') || product.name),
      slug: normalizedSlug,
      price: Number(payload.get('price') || product.price),
      brand: normalizeBrand(String(payload.get('brand') || product.brand)),
      categoryName: selectedCategory?.name,
    })
    try {
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
        categoryId: selectedCategoryId,
        categoryIds: Array.from(
          new Set([selectedCategoryId, ...additionalCategoryIds.map((id) => Number(id))].filter((id) => id > 0)),
        ),
        categorySlug: selectedCategory?.slug || product.categorySlug,
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
        serviceInfo: String(payload.get('serviceInfo') ?? serviceInfoHtml).trim() || undefined,
        recommendedAccessoryIds: recommendedAccessoryIds.map((id) => Number(id)),
        variantGroup: String(payload.get('variantGroup') || '').trim(),
        variantName: String(payload.get('variantName') || '').trim(),
        variantValue: String(payload.get('variantValue') || '').trim(),
        metaTitle: normalizeMetaTitleForSave(seoInputForSave, metaTitle),
        metaDescription: normalizeMetaDescriptionForSave(seoInputForSave, metaDescription),
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

  const selectedCategory = useMemo(
    () =>
      categories.find((category) => String(category.id) === String(categoryId || product?.categoryId)) ??
      null,
    [categories, categoryId, product?.categoryId]
  )

  const seoFallback: ProductSeoInput = useMemo(
    () => ({
      name: product?.name ?? '',
      slug: slug || product?.slug || '',
      price: product?.price ?? 0,
      brand: product?.brand ?? '',
      categoryName: selectedCategory?.name,
    }),
    [product, slug, selectedCategory]
  )

  const seoInputLive = useMemo(
    () =>
      seoOpen && product
        ? readProductSeoFromForm('product-edit-form', seoFallback)
        : seoFallback,
    [seoOpen, product, seoFallback, seoFormTick]
  )

  const seoPreviewShort = useMemo(
    () => buildProductSeoPreview(seoInputLive, metaTitle, metaDescription).title,
    [seoInputLive, metaTitle, metaDescription]
  )

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>
  if (!product) return <p className="text-muted-foreground">Товар не найден</p>

  const selectedAccessories = catalogProducts.filter((item) => recommendedAccessoryIds.includes(String(item.id)))
  const availableAccessories = catalogProducts
    .filter((item) => String(item.id) !== String(product.id))
    .filter((item) => !recommendedAccessoryIds.includes(String(item.id)))
    .filter((item) => item.name.toLowerCase().includes(accessoriesSearch.toLowerCase()))
    .slice(0, 20)
  const existingVariantGroups = Array.from(
    new Set(catalogProducts.map((item) => item.variantGroup?.trim()).filter(Boolean) as string[])
  )
  const productsInVariantGroup = variantGroup.trim()
    ? catalogProducts
        .filter((item) => item.variantGroup?.trim() === variantGroup.trim() && String(item.id) !== String(product.id))
        .slice(0, 8)
    : []

  const addAccessory = (id: string) => {
    const normalizedId = String(id)
    setRecommendedAccessoryIds((prev) => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]))
  }

  const removeAccessory = (id: string) => {
    const normalizedId = String(id)
    setRecommendedAccessoryIds((prev) => prev.filter((item) => item !== normalizedId))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Link href="/admin/products"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><h1 className="text-2xl font-bold">Редактирование товара</h1></div>
      <form
        id="product-edit-form"
        onSubmit={handleSave}
        onInput={() => {
          if (seoOpen) setSeoFormTick((t) => t + 1)
        }}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-6">
          <Card className="border-blue-200/70 bg-blue-50/30 shadow-sm">
            <CardHeader className="border-b bg-blue-100/40">
              <CardTitle>Основная информация</CardTitle>
              <p className="text-xs text-muted-foreground">Название, URL, описание и категория товара.</p>
            </CardHeader>
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
              <input type="hidden" name="serviceInfo" value={serviceInfoHtml} />
              <Input name="brand" defaultValue={product.brand} />
              <ProductCategoriesEditor
                categories={categories}
                primaryCategoryId={categoryId || String(product.categoryId)}
                additionalCategoryIds={additionalCategoryIds}
                onPrimaryChange={(nextCategoryId) => {
                  setCategoryId(nextCategoryId)
                  setAdditionalCategoryIds((prev) => prev.filter((id) => id !== nextCategoryId))
                }}
                onAdditionalChange={setAdditionalCategoryIds}
              />
            </CardContent>
          </Card>
          <ProductSpecsEditor category={selectedCategory} rows={specRows} onChange={setSpecRows} />

          <Card className="border-sky-200/70 bg-sky-50/30 shadow-sm">
            <CardHeader className="border-b bg-sky-100/40">
              <CardTitle>Варианты товара</CardTitle>
              <p className="text-xs text-muted-foreground">
                Объедините одинаковые модели, чтобы на витрине появился переключатель диагоналей.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="variant-group-edit">Код группы вариантов</Label>
                <Input
                  id="variant-group-edit"
                  name="variantGroup"
                  list="variant-groups-edit"
                  placeholder="Например samsung-q80c"
                  value={variantGroup}
                  onChange={(event) => setVariantGroup(event.target.value)}
                />
                <datalist id="variant-groups-edit">
                  {existingVariantGroups.map((group) => (
                    <option key={group} value={group} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Укажите одинаковый код у всех размеров одной модели. Если поле пустое, переключатель не показывается.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="variant-name-edit">Название параметра</Label>
                  <Input
                    id="variant-name-edit"
                    name="variantName"
                    placeholder="Диагональ"
                    defaultValue={product.variantName || 'Диагональ'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant-value-edit">Значение этого товара</Label>
                  <Input
                    id="variant-value-edit"
                    name="variantValue"
                    placeholder='55"'
                    defaultValue={product.variantValue || ''}
                  />
                </div>
              </div>
              {productsInVariantGroup.length > 0 && (
                <div className="rounded-md border bg-background p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Другие товары в этой группе:</p>
                  <div className="space-y-1">
                    {productsInVariantGroup.map((item) => (
                      <p key={item.id} className="truncate text-sm">
                        {item.variantValue || 'Без значения'} — {item.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-violet-200/70 bg-violet-50/30 shadow-sm">
            <CardHeader className="border-b bg-violet-100/40">
              <CardTitle>Сервисные услуги</CardTitle>
              <p className="text-xs text-muted-foreground">Контент вкладки «Сервисные услуги» на странице товара.</p>
            </CardHeader>
            <CardContent>
              <DescriptionBlocksEditor
                ref={serviceInfoEditorRef}
                value={serviceInfoHtml}
                onChange={setServiceInfoHtml}
                onUploadImageFile={handleUploadDescriptionImage}
                onDeleteImageFile={handleDeleteDescriptionImage}
              />
            </CardContent>
          </Card>

          <Card className="border-amber-200/70 bg-amber-50/30 shadow-sm">
            <CardHeader className="border-b bg-amber-100/40">
              <CardTitle>Рекомендуемые аксессуары</CardTitle>
              <p className="text-xs text-muted-foreground">Товары из каталога для блока рекомендаций на витрине.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={accessoriesSearch}
                onChange={(event) => setAccessoriesSearch(event.target.value)}
                placeholder="Поиск товара по названию"
              />
              <div className="space-y-2">
                {selectedAccessories.length > 0 ? (
                  selectedAccessories.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded border bg-muted/30">
                          <Image
                            src={resolveMediaUrl(item.images?.[0] || '/placeholder.svg')}
                            alt={item.name}
                            fill
                            unoptimized
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {item.id}</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAccessory(item.id)}>
                        Убрать
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Пока не выбрано ни одного аксессуара.</p>
                )}
              </div>
              <div className="space-y-2 border-t pt-3">
                {availableAccessories.length > 0 ? (
                  availableAccessories.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded border bg-muted/30">
                          <Image
                            src={resolveMediaUrl(item.images?.[0] || '/placeholder.svg')}
                            alt={item.name}
                            fill
                            unoptimized
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {item.id}</p>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => addAccessory(item.id)}>
                        Добавить
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">По вашему запросу товары не найдены.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card className="shadow-sm border-emerald-200/70">
            <CardHeader>
              <CardTitle>Поисковые сервисы (SEO)</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Заголовок и описание для Яндекса и Google.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm line-clamp-2 text-muted-foreground">{seoPreviewShort || 'Заполните название товара'}</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSeoFormTick((t) => t + 1)
                  setSeoOpen(true)
                }}
              >
                Настроить SEO
              </Button>
              <input type="hidden" name="metaTitle" value={metaTitle} />
              <input type="hidden" name="metaDescription" value={metaDescription} />
            </CardContent>
          </Card>

          <ProductSeoDialog
            open={seoOpen}
            onOpenChange={(open) => {
              setSeoOpen(open)
              if (open) setSeoFormTick((t) => t + 1)
            }}
            seoInput={seoInputLive}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            onApply={(title, description) => {
              setMetaTitle(title)
              setMetaDescription(description)
            }}
          />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Цена и наличие</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="number" name="price" defaultValue={product.price} required />
              <Input type="number" name="oldPrice" defaultValue={product.oldPrice} />
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
              <Input name="sku" placeholder="SKU / артикул" defaultValue={product.sku} />
              <Input type="number" name="warrantyMonths" placeholder="Гарантия, мес" min={0} step={1} defaultValue={product.warrantyMonths} />
              <Input name="warrantyType" placeholder="Тип гарантии (например, официальная)" defaultValue={product.warrantyType} />
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
                </CollapsibleContent>
              </Collapsible>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isNew" defaultChecked={product.isNew} />
                Новинка
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
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
          <Card className="border-dashed shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Подсказки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>После редактирования проверьте карточку на витрине: описание, аксессуары и фото.</p>
              <p>Если меняете структуру блоков, лучше сохранить и открыть товар в новой вкладке для контроля.</p>
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

