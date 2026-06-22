'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { ProductImage } from '@/components/ui/product-image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { categoriesApi, productsApi } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media'
import type { Category, Product } from '@/types'
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react'

async function loadCategoryProducts(categorySlug: string): Promise<Product[]> {
  const allProducts: Product[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await productsApi.getAll({ categorySlug }, page, 100)
    allProducts.push(...response.data)
    totalPages = response.totalPages || 1
    page += 1
  }

  return allProducts
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export default function AdminCategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState('')
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editParentId, setEditParentId] = useState('')
  const [showOnHome, setShowOnHome] = useState(false)
  const [editShowOnHome, setEditShowOnHome] = useState(false)
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [removeEditImage, setRemoveEditImage] = useState(false)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [addingProductId, setAddingProductId] = useState<string | null>(null)
  const [removingProductId, setRemovingProductId] = useState<string | null>(null)

  const categoriesWithCount = useMemo(() => categories, [categories])

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.getAll()
      setCategories(res.data)
    } catch (error) {
      console.error('Failed to load categories', error)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (!isEditDialogOpen || productSearch.trim().length < 1) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const response = await productsApi.search(productSearch.trim())
        const inCategory = new Set(categoryProducts.map((item) => String(item.id)))
        setSearchResults(
          response.data
            .filter((item) => !inCategory.has(String(item.id)))
            .slice(0, 20)
            .map((item) => ({ ...item, id: String(item.id) }))
        )
      } catch (error) {
        console.error('Failed to search products', error)
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [productSearch, isEditDialogOpen, categoryProducts])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const createdResponse = await categoriesApi.create({
        name,
        slug: slugify(slug || name),
        order: categories.length + 1,
        parentId: parentId ? Number(parentId) : undefined,
        showOnHome,
      })
      const created = createdResponse.data
      if (created && newImageFile) {
        await categoriesApi.uploadImage(created.id, newImageFile)
      }
      setName('')
      setSlug('')
      setParentId('')
      setShowOnHome(false)
      setNewImageFile(null)
      setIsDialogOpen(false)
      await loadCategories()
    } catch (error) {
      console.error('Failed to create category', error)
      alert('Не удалось создать категорию')
    }
  }

  const openEditDialog = async (category: Category) => {
    setEditingCategory(category)
    setEditName(category.name)
    setEditSlug(category.slug)
    setEditParentId(category.parentId || '')
    setEditShowOnHome(Boolean(category.showOnHome))
    setRemoveEditImage(false)
    setEditImageFile(null)
    setProductSearch('')
    setSearchResults([])
    setCategoryProducts([])
    setIsEditDialogOpen(true)

    setProductsLoading(true)
    try {
      const products = await loadCategoryProducts(category.slug)
      setCategoryProducts(products.map((item) => ({ ...item, id: String(item.id) })))
    } catch (error) {
      console.error('Failed to load category products', error)
      setCategoryProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  const handleAddProductToCategory = async (productId: string) => {
    if (!editingCategory) return

    setAddingProductId(productId)
    try {
      const response = await categoriesApi.addProduct(editingCategory.id, productId)
      const updated = { ...response.data, id: String(response.data.id) }
      setCategoryProducts((prev) => {
        if (prev.some((item) => item.id === updated.id)) return prev
        return [...prev, updated]
      })
      setSearchResults((prev) => prev.filter((item) => item.id !== productId))
      await loadCategories()
      toast.success('Товар добавлен в категорию')
    } catch (error) {
      console.error('Failed to add product to category', error)
      toast.error('Не удалось добавить товар в категорию')
    } finally {
      setAddingProductId(null)
    }
  }

  const handleRemoveProductFromCategory = async (productId: string) => {
    if (!editingCategory) return

    setRemovingProductId(productId)
    try {
      await categoriesApi.removeProduct(editingCategory.id, productId)
      setCategoryProducts((prev) => prev.filter((item) => item.id !== productId))
      await loadCategories()
      toast.success('Товар убран из категории')
    } catch (error: unknown) {
      console.error('Failed to remove product from category', error)
      const message = error instanceof Error ? error.message : 'Не удалось убрать товар из категории'
      toast.error(message)
    } finally {
      setRemovingProductId(null)
    }
  }

  const formatProductCategories = (item: Product) => {
    const labels = (item.categories ?? [])
      .map((category) => (category.isPrimary ? `${category.name} (основная)` : category.name))
      .filter(Boolean)
    if (labels.length > 0) return labels.join(', ')
    const primaryName = categories.find((cat) => cat.id === String(item.categoryId))?.name
    return primaryName ? `Основная: ${primaryName}` : `ID: ${item.id}`
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    try {
      const payload: Parameters<typeof categoriesApi.update>[1] = {
        name: editName,
        slug: slugify(editSlug || editName),
        parentId: editParentId ? Number(editParentId) : null,
        showOnHome: editShowOnHome,
      }
      if (removeEditImage) {
        payload.image = null
      }

      await categoriesApi.update(editingCategory.id, payload)
      if (editImageFile) {
        await categoriesApi.uploadImage(editingCategory.id, editImageFile)
      }
      setIsEditDialogOpen(false)
      setEditingCategory(null)
      setEditImageFile(null)
      await loadCategories()
    } catch (error) {
      console.error('Failed to update category', error)
      alert('Не удалось обновить категорию')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить категорию?')) return
    try {
      await categoriesApi.delete(id)
      await loadCategories()
    } catch (error: any) {
      alert(error?.message || 'Не удалось удалить категорию')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Категории</h1>
          <p className="text-muted-foreground">
            Управление категориями товаров
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить категорию
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая категория</DialogTitle>
              <DialogDescription>
                Заполните данные категории и при необходимости привяжите её к родительской.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input id="name" placeholder="Например: Телевизоры" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL-адрес</Label>
                <Input id="slug" placeholder="televizory" value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon-file">Картинка категории</Label>
                <Input id="icon-file" type="file" accept="image/*" onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Выберите изображение с компьютера (JPG, PNG, WEBP).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Родительская категория (подкатегория)</Label>
                <select
                  id="parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Без родителя</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-on-home"
                  checked={showOnHome}
                  onCheckedChange={(checked) => setShowOnHome(Boolean(checked))}
                />
                <Label htmlFor="show-on-home" className="cursor-pointer">
                  Показывать на главной странице
                </Label>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  Создать
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Редактировать категорию</DialogTitle>
              <DialogDescription>
                Измените название, URL и параметры отображения категории.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpdate}>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Название</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">URL-адрес</Label>
                <Input id="edit-slug" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image-file">Картинка категории</Label>
                <Input id="edit-image-file" type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Выберите новый файл, чтобы заменить текущее изображение.</p>
              </div>
              {editingCategory?.image && !removeEditImage && !editImageFile && (
                <div className="space-y-2">
                  <Label>Текущее изображение</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-md border overflow-hidden bg-muted">
                      <ProductImage
                        src={editingCategory.image}
                        alt={editingCategory.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={() => setRemoveEditImage(true)}>
                      Удалить картинку
                    </Button>
                  </div>
                </div>
              )}
              {removeEditImage && (
                <p className="text-sm text-amber-600">
                  Изображение будет удалено после сохранения.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-parent">Родительская категория</Label>
                <select
                  id="edit-parent"
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Без родителя</option>
                  {categories
                    .filter((cat) => cat.id !== editingCategory?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-show-on-home"
                  checked={editShowOnHome}
                  onCheckedChange={(checked) => setEditShowOnHome(Boolean(checked))}
                />
                <Label htmlFor="edit-show-on-home" className="cursor-pointer">
                  Показывать на главной странице
                </Label>
              </div>
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="space-y-1">
                  <Label htmlFor="category-product-search">Товары в категории</Label>
                  <p className="text-xs text-muted-foreground">
                    Найдите существующий товар в каталоге и добавьте его в эту категорию без смены основной категории.
                  </p>
                </div>
                <Input
                  id="category-product-search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Поиск товара по названию"
                />
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {productsLoading ? (
                    <p className="text-sm text-muted-foreground">Загрузка товаров...</p>
                  ) : categoryProducts.length > 0 ? (
                    categoryProducts.map((item) => {
                      const isPrimary = String(item.categoryId) === editingCategory?.id
                      return (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border bg-background p-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted/30">
                            <Image
                              src={resolveMediaUrl(item.images?.[0] || '/placeholder.svg')}
                              alt={item.name}
                              fill
                              unoptimized
                              className="object-contain p-1"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{item.name}</p>
                              {isPrimary && <Badge variant="secondary">Основная</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatProductCategories(item)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPrimary || removingProductId === item.id}
                          onClick={() => handleRemoveProductFromCategory(item.id)}
                        >
                          {isPrimary ? 'Основная' : removingProductId === item.id ? 'Удаление...' : 'Убрать'}
                        </Button>
                      </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">В этой категории пока нет товаров.</p>
                  )}
                </div>
                {productSearch.trim().length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border bg-background p-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted/30">
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
                              <p className="text-xs text-muted-foreground">{formatProductCategories(item)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={addingProductId === item.id}
                            onClick={() => handleAddProductToCategory(item.id)}
                          >
                            {addingProductId === item.id ? 'Добавление...' : 'Добавить'}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">По вашему запросу товары не найдены.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  Сохранить
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Иконка</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Товаров</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesWithCount.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {category.image ? (
                          <ProductImage
                            src={category.image}
                            alt={category.name}
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {category.parentId ? `— ${category.name}` : category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      /catalog/{category.slug}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{category.productCount} товаров</Badge>
                        {category.showOnHome && <Badge>Главная</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
