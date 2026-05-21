'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ProductImage } from '@/components/ui/product-image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatPrice } from '@/lib/formatters'
import { categoriesApi, productsApi } from '@/lib/api'
import type { Category, Product, ProductFilters } from '@/types'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Package,
  Download,
  Filter,
} from 'lucide-react'

type FlatCategory = { id: string; slug: string; name: string; depth: number }

function flattenCategories(categories: Category[], depth = 0): FlatCategory[] {
  const result: FlatCategory[] = []
  for (const category of categories) {
    result.push({
      id: category.id,
      slug: category.slug,
      name: category.name,
      depth,
    })
    if (category.children?.length) {
      result.push(...flattenCategories(category.children, depth + 1))
    }
  }
  return result
}

function InlineProductPriceEditor({
  product,
  onUpdated,
}: {
  product: Product
  onUpdated: (updated: Product) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(String(product.price))
  const [isSaving, setIsSaving] = useState(false)

  const resetDraft = () => setDraft(String(product.price))

  const handleStartEdit = () => {
    resetDraft()
    setIsEditing(true)
  }

  const handleCancel = () => {
    resetDraft()
    setIsEditing(false)
  }

  const handleSave = async () => {
    const nextPrice = Math.round(Number(draft.replace(/\s/g, '')))
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      toast.error('Введите корректную цену (целое число ≥ 0)')
      return
    }
    if (nextPrice === product.price) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const response = await productsApi.update(product.id, { price: nextPrice })
      onUpdated(response.data)
      toast.success('Цена обновлена')
      setIsEditing(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить цену')
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          step={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          className="h-8 w-32"
          disabled={isSaving}
          autoFocus
        />
        <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Изменить'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
          Отмена
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="font-medium">{formatPrice(product.price)}</p>
      {product.oldPrice != null && product.oldPrice > 0 && (
        <p className="text-sm text-muted-foreground line-through">
          {formatPrice(product.oldPrice)}
        </p>
      )}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0 text-primary"
        onClick={handleStartEdit}
      >
        Изменить
      </Button>
    </div>
  )
}

export default function AdminProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState<FlatCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories) {
      map.set(category.slug, category.name)
    }
    return map
  }, [categories])

  const buildFilters = useCallback((): ProductFilters | undefined => {
    const filters: ProductFilters = {}
    if (categoryFilter !== 'all') {
      filters.categorySlug = categoryFilter
    }
    const query = searchQuery.trim()
    if (query) {
      filters.search = query
    }
    return Object.keys(filters).length ? filters : undefined
  }, [categoryFilter, searchQuery])

  const loadProducts = useCallback(
    async (nextPage = 1, replace = false) => {
      try {
        setIsLoadingMore(true)
        const res = await productsApi.getAll(buildFilters(), nextPage, 20)
        setProducts((prev) => (replace ? res.data : [...prev, ...res.data]))
        setTotal(res.total)
        setHasMore(nextPage < res.totalPages)
        setPage(nextPage)
      } catch (error) {
        console.error('Failed to load products', error)
        toast.error('Не удалось загрузить товары')
      } finally {
        setIsLoadingMore(false)
      }
    },
    [buildFilters]
  )

  useEffect(() => {
    categoriesApi
      .getTree()
      .then((response) => setCategories(flattenCategories(response.data)))
      .catch((error) => console.error('Failed to load categories', error))
  }, [])

  useEffect(() => {
    const delay = searchQuery.trim() ? 300 : 0
    const timer = window.setTimeout(() => {
      loadProducts(1, true)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [categoryFilter, searchQuery, loadProducts])

  const handleDelete = async (id: string) => {
    if (!confirm('Это уберёт товар из каталога. Продолжить?')) return
    try {
      await productsApi.delete(id)
      toast.success('Товар удалён из каталога')
      await loadProducts(1, true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить товар')
    }
  }

  const handleProductUpdated = (updated: Product) => {
    setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  const handleExport = async () => {
    try {
      const blob = await productsApi.export()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'products.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export products', error)
      toast.error('Не удалось выгрузить CSV')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Товары</h1>
          <p className="text-muted-foreground">
            Управление каталогом товаров
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Link href="/admin/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить товар
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск товаров..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <Filter className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {'\u00a0'.repeat(category.depth * 2)}
                    {category.depth > 0 ? '— ' : ''}
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground sm:ml-auto sm:self-center">
              Найдено: {total}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Фото</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Наличие</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {product.images[0] ? (
                          <ProductImage
                            src={product.images[0]}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {product.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {categoryNameBySlug.get(product.categorySlug) || product.categorySlug}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <InlineProductPriceEditor
                        product={product}
                        onUpdated={handleProductUpdated}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.inStock ? 'default' : 'destructive'}
                        className={product.inStock ? 'bg-green-100 text-green-800' : ''}
                      >
                        {product.inStock ? 'В наличии' : 'Нет в наличии'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/product/${product.slug}`} target="_blank">
                              <Eye className="h-4 w-4 mr-2" />
                              Просмотр
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${product.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Редактировать
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-center">
            {hasMore ? (
              <Button
                variant="outline"
                onClick={() => loadProducts(page + 1)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Загрузка...' : 'Ещё'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Все товары загружены</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
