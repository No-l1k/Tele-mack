'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ChevronDown } from 'lucide-react'
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
import { injectUploadedImageUrls } from '@/lib/description-blocks'
import { PRODUCT_IMAGE_GUIDELINE } from '@/lib/admin-product-images'
import { normalizeProductSlug, normalizeProductSlugInput } from '@/lib/admin-slug'
import { resolveMediaUrl } from '@/lib/media'
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

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([])
  const [recommendedAccessoryIds, setRecommendedAccessoryIds] = useState<string[]>([])
  const [accessoriesSearch, setAccessoriesSearch] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [descriptionHtml, setDescriptionHtml] = useState('')
  const [serviceInfoHtml, setServiceInfoHtml] = useState('')
  const [ratingMode, setRatingMode] = useState<'manual' | 'auto'>('manual')
  const [isLoading, setIsLoading] = useState(false)
  const [specRows, setSpecRows] = useState<SpecRow[]>([{ id: 'spec-1', key: '', value: '' }])
  const [additionalOpen, setAdditionalOpen] = useState(false)
  const [seoOpen, setSeoOpen] = useState(false)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [seoFormTick, setSeoFormTick] = useState(0)
  const [variantGroup, setVariantGroup] = useState('')
  const descriptionEditorRef = useRef<DescriptionBlocksEditorHandle>(null)
  const serviceInfoEditorRef = useRef<DescriptionBlocksEditorHandle>(null)

  useEffect(() => {
    ;(async () => {
      const [categoriesResponse, products] = await Promise.all([
        categoriesApi.getAll().catch(() => null),
        loadCatalogProducts().catch(() => []),
      ])
      setCategories(categoriesResponse?.data ?? [])
      setCatalogProducts(products.map((item) => ({ ...item, id: String(item.id) })))
    })()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!htmlToText(descriptionHtml)) {
      toast.error('Заполните описание товара')
      return
    }
    const normalizedSlug = normalizeProductSlug(slug)
    if (!normalizedSlug) {
      toast.error('Укажите ссылку на товар: латиница и дефисы, например canon-eos-r6')
      return
    }
    setIsLoading(true)
    const payload = new FormData(event.currentTarget)
    const selectedCategory = categories.find((category) => category.id === categoryId) ?? null
    const seoInputForSave = readProductSeoFromForm('product-new-form', {
      name: String(payload.get('name') || name),
      slug: normalizedSlug,
      price: Number(payload.get('price') || 0),
      brand: normalizeBrand(String(payload.get('brand') || '')),
      categoryName: selectedCategory?.name,
    })
    const specs = Object.fromEntries(
      specRows
        .map((row) => [row.key.trim(), row.value.trim()] as const)
        .filter(([key, value]) => key.length > 0 && value.length > 0)
    )
    try {
      const response = await productsApi.create({
        name: String(payload.get('name') || ''),
        slug: normalizedSlug,
        description: String(payload.get('description') || descriptionHtml),
        shortDescription: String(payload.get('shortDescription') || ''),
        price: Number(payload.get('price') || 0),
        oldPrice: payload.get('oldPrice') ? Number(payload.get('oldPrice')) : undefined,
        categoryId: Number(categoryId),
        categorySlug: selectedCategory?.slug || '',
        brand: normalizeBrand(String(payload.get('brand') || '')),
        sku: String(payload.get('sku') || '').trim() || undefined,
        gtin: String(payload.get('gtin') || '').trim() || undefined,
        specs,
        inStock: ['in_stock', 'low_stock'].includes(String(payload.get('stockStatus') || 'in_stock')),
        stockStatus: String(payload.get('stockStatus') || 'in_stock') as 'in_stock' | 'low_stock' | 'preorder' | 'out_of_stock',
        isNew: payload.get('isNew') === 'on',
        ratingMode,
        rating: ratingMode === 'manual' ? Number(payload.get('rating') || 4.8) : undefined,
        reviewsCount: ratingMode === 'manual' ? Number(payload.get('reviewsCount') || 0) : undefined,
        warrantyMonths: payload.get('warrantyMonths') ? Number(payload.get('warrantyMonths')) : undefined,
        warrantyType: String(payload.get('warrantyType') || '').trim() || undefined,
        serviceInfo: String(payload.get('serviceInfo') || '').trim() || undefined,
        recommendedAccessoryIds: recommendedAccessoryIds.map((id) => Number(id)),
        variantGroup: String(payload.get('variantGroup') || '').trim() || undefined,
        variantName: String(payload.get('variantName') || '').trim() || undefined,
        variantValue: String(payload.get('variantValue') || '').trim() || undefined,
        metaTitle: normalizeMetaTitleForSave(seoInputForSave, metaTitle),
        metaDescription: normalizeMetaDescriptionForSave(seoInputForSave, metaDescription),
        images: [],
      })
      const productId = String(response.data.id)
      let finalDescription = String(payload.get('description') || descriptionHtml)
      let finalServiceInfo = String(payload.get('serviceInfo') || serviceInfoHtml)

      const uploadPendingEditorImages = async (
        editorRef: { current: DescriptionBlocksEditorHandle | null },
        html: string,
      ) => {
        const pendingImages = editorRef.current?.getPendingImageFilesByBlockId() ?? {}
        const pendingEntries = Object.entries(pendingImages).filter(([, file]) => file)
        if (pendingEntries.length === 0) return html

        const urlsByBlockId: Record<string, string> = {}
        for (const [blockId, file] of pendingEntries) {
          const uploaded = await productsApi.uploadImages(productId, [file])
          const url = uploaded.data?.[0]
          if (url) urlsByBlockId[blockId] = url
        }
        return injectUploadedImageUrls(html, urlsByBlockId)
      }

      finalDescription = await uploadPendingEditorImages(descriptionEditorRef, finalDescription)
      finalServiceInfo = await uploadPendingEditorImages(serviceInfoEditorRef, finalServiceInfo)

      if (finalDescription !== descriptionHtml || finalServiceInfo !== serviceInfoHtml) {
        await productsApi.update(productId, {
          description: finalDescription,
          serviceInfo: finalServiceInfo.trim() || undefined,
        })
      }
      if (images.length > 0) {
        await productsApi.uploadImages(productId, images)
      }
      toast.success('Товар сохранён')
      router.push('/admin/products')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось создать товар')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedAccessories = catalogProducts.filter((item) => recommendedAccessoryIds.includes(String(item.id)))
  const availableAccessories = catalogProducts
    .filter((item) => !recommendedAccessoryIds.includes(String(item.id)))
    .filter((item) => item.name.toLowerCase().includes(accessoriesSearch.toLowerCase()))
    .slice(0, 20)
  const existingVariantGroups = Array.from(
    new Set(catalogProducts.map((item) => item.variantGroup?.trim()).filter(Boolean) as string[])
  )
  const productsInVariantGroup = variantGroup.trim()
    ? catalogProducts.filter((item) => item.variantGroup?.trim() === variantGroup.trim()).slice(0, 8)
    : []

  const addAccessory = (id: string) => {
    const normalizedId = String(id)
    setRecommendedAccessoryIds((prev) => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]))
  }

  const removeAccessory = (id: string) => {
    const normalizedId = String(id)
    setRecommendedAccessoryIds((prev) => prev.filter((item) => item !== normalizedId))
  }

  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null

  const seoFallback: ProductSeoInput = {
    name,
    slug,
    price: 0,
    brand: '',
    categoryName: selectedCategory?.name,
  }

  const seoInputLive = useMemo(
    () => (seoOpen ? readProductSeoFromForm('product-new-form', seoFallback) : seoFallback),
    [seoOpen, seoFallback, seoFormTick]
  )

  const seoPreviewShort = buildProductSeoPreview(seoInputLive, metaTitle, metaDescription).title

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">Новый товар</h1>
      </div>
      <form
        id="product-new-form"
        onSubmit={handleSubmit}
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
              <Input
                name="name"
                placeholder="Название"
                required
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value
                  setName(nextName)
                  if (!slugTouched) {
                    setSlug(normalizeProductSlugInput(nextName))
                  }
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="product-slug">Ссылка на товар</Label>
                <Input
                  id="product-slug"
                  name="slug"
                  placeholder="canon-eos-r6-mark-iii"
                  required
                  autoComplete="off"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setSlug(normalizeProductSlugInput(event.target.value))
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Латиница и дефисы, например <span className="font-mono">canon-eos-r6</span>. Заполняется из названия автоматически — можно поправить вручную.
                </p>
              </div>
              <Textarea name="shortDescription" placeholder="Короткое описание" />
              <input type="hidden" name="description" value={descriptionHtml} />
              <DescriptionBlocksEditor
                ref={descriptionEditorRef}
                value={descriptionHtml}
                onChange={setDescriptionHtml}
              />
              <input type="hidden" name="serviceInfo" value={serviceInfoHtml} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="brand" placeholder="Бренд" />
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
                  <option value="">Категория</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
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
                <Label htmlFor="variant-group-new">Код группы вариантов</Label>
                <Input
                  id="variant-group-new"
                  name="variantGroup"
                  list="variant-groups-new"
                  placeholder="Например samsung-q80c"
                  value={variantGroup}
                  onChange={(event) => setVariantGroup(event.target.value)}
                />
                <datalist id="variant-groups-new">
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
                  <Label htmlFor="variant-name-new">Название параметра</Label>
                  <Input id="variant-name-new" name="variantName" placeholder="Диагональ" defaultValue="Диагональ" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant-value-new">Значение этого товара</Label>
                  <Input id="variant-value-new" name="variantValue" placeholder='55"' />
                </div>
              </div>
              {productsInVariantGroup.length > 0 && (
                <div className="rounded-md border bg-background p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Уже в этой группе:</p>
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
              />
            </CardContent>
          </Card>

          <Card className="border-amber-200/70 bg-amber-50/30 shadow-sm">
            <CardHeader className="border-b bg-amber-100/40">
              <CardTitle>Рекомендуемые аксессуары</CardTitle>
              <p className="text-xs text-muted-foreground">Выберите товары, которые показываются в отдельном блоке на карточке.</p>
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
                Превью сниппета в поиске и автозаполнение Title / Description.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm line-clamp-2 text-muted-foreground">{seoPreviewShort || 'Укажите название товара'}</p>
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
              <Input type="number" name="price" placeholder="Цена" required />
              <Input type="number" name="oldPrice" placeholder="Старая цена" />
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
              <Input type="number" name="warrantyMonths" placeholder="Гарантия, мес" min={0} step={1} />
              <Input name="warrantyType" placeholder="Тип гарантии (например, официальная)" />
              <Collapsible open={additionalOpen} onOpenChange={setAdditionalOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between">
                    Дополнительно (необязательно)
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${additionalOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gtin-new">Штрихкод GTIN / EAN</Label>
                    <Input id="gtin-new" name="gtin" placeholder="Необязательно, 8–14 цифр" />
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isNew" />
                Новинка
              </label>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
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
          <Card className="border-dashed shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Подсказки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Старайтесь делать короткий и понятный slug для SEO.</p>
              <p>Добавьте хотя бы 2-3 ключевые характеристики, чтобы карточка выглядела законченной.</p>
              <p>Для аксессуаров лучше выбирать 3-8 товаров, чтобы блок смотрелся аккуратно.</p>
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

