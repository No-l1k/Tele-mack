'use client'

import { useMemo, useState } from 'react'
import type { Category } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'

interface ProductCategoriesEditorProps {
  categories: Category[]
  primaryCategoryId: string
  additionalCategoryIds: string[]
  onPrimaryChange: (categoryId: string) => void
  onAdditionalChange: (categoryIds: string[]) => void
}

export function ProductCategoriesEditor({
  categories,
  primaryCategoryId,
  additionalCategoryIds,
  onPrimaryChange,
  onAdditionalChange,
}: ProductCategoriesEditorProps) {
  const [search, setSearch] = useState('')

  const selectedAdditional = useMemo(
    () => categories.filter((category) => additionalCategoryIds.includes(category.id)),
    [categories, additionalCategoryIds],
  )

  const availableCategories = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            category.id !== primaryCategoryId &&
            !additionalCategoryIds.includes(category.id) &&
            category.name.toLowerCase().includes(search.trim().toLowerCase()),
        )
        .slice(0, 15),
    [categories, primaryCategoryId, additionalCategoryIds, search],
  )

  const addCategory = (categoryId: string) => {
    if (additionalCategoryIds.includes(categoryId) || categoryId === primaryCategoryId) return
    onAdditionalChange([...additionalCategoryIds, categoryId])
  }

  const removeCategory = (categoryId: string) => {
    onAdditionalChange(additionalCategoryIds.filter((id) => id !== categoryId))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="primary-category">Основная категория</Label>
        <select
          id="primary-category"
          name="categoryId"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={primaryCategoryId}
          onChange={(event) => onPrimaryChange(event.target.value)}
          required
        >
          <option value="" disabled>
            Выберите категорию
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.parentId ? `— ${category.name}` : category.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Основная категория используется для SEO, шаблона характеристик и фида Яндекса.
        </p>
      </div>

      <div className="space-y-3 rounded-md border bg-background/70 p-3">
        <div className="space-y-1">
          <Label htmlFor="additional-categories-search">Дополнительные категории</Label>
          <p className="text-xs text-muted-foreground">
            Товар будет отображаться и в этих разделах каталога, не меняя основную категорию.
          </p>
        </div>
        <Input
          id="additional-categories-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск категории по названию"
        />
        <div className="space-y-2">
          {selectedAdditional.length > 0 ? (
            selectedAdditional.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">/catalog/{category.slug}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeCategory(category.id)}>
                  Убрать
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Дополнительные категории не выбраны.</p>
          )}
        </div>
        {search.trim().length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {availableCategories.length > 0 ? (
              availableCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">/catalog/{category.slug}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addCategory(category.id)}>
                    Добавить
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Категории не найдены.</p>
            )}
          </div>
        )}
        {selectedAdditional.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedAdditional.map((category) => (
              <Badge key={category.id} variant="secondary">
                {category.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
