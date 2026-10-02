'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { categoriesApi, productsApi, specTemplatesApi } from '@/lib/api'
import type { SpecTemplate } from '@/lib/product-spec-templates'
import { cn } from '@/lib/utils'
import type { Category, SpecDictionaryItem } from '@/types'
import { SpecAutocomplete, type SpecSuggestionGroup } from '@/components/admin/spec-autocomplete'

type FlatCategory = { id: number; name: string; depth: number }

type DraftSpec = {
  id: string
  name: string
  values: string
}

type DraftTemplate = {
  id: string
  title: string
  match: string
  categoryIds: number[]
  specs: DraftSpec[]
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function flattenCategories(categories: Category[], depth = 0): FlatCategory[] {
  const result: FlatCategory[] = []
  for (const category of categories) {
    const id = Number(category.id)
    if (Number.isFinite(id) && id > 0) {
      result.push({ id, name: category.name, depth })
    }
    if (category.children?.length) {
      result.push(...flattenCategories(category.children, depth + 1))
    }
  }
  return result
}

function toDraft(template: SpecTemplate): DraftTemplate {
  return {
    id: template.id?.trim() || newId('tpl'),
    title: template.title,
    match: (template.match ?? []).join(', '),
    categoryIds: [...(template.categoryIds ?? [])],
    specs: (template.specs ?? []).map((spec) => ({
      id: newId('spec'),
      name: spec.name,
      values: (spec.values ?? []).join(', '),
    })),
  }
}

function emptyTemplate(): DraftTemplate {
  return {
    id: newId('tpl'),
    title: 'Новый шаблон',
    match: '',
    categoryIds: [],
    specs: [{ id: newId('spec'), name: '', values: '' }],
  }
}

function fromDraft(draft: DraftTemplate): SpecTemplate {
  return {
    id: draft.id,
    title: draft.title.trim() || 'Шаблон',
    match: draft.match
      .split(',')
      .map((item) => item.trim().toLocaleLowerCase('ru-RU'))
      .filter(Boolean),
    categoryIds: draft.categoryIds,
    specs: draft.specs
      .map((spec) => ({
        name: spec.name.trim().replace(/\s+/g, ' '),
        values: spec.values
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      }))
      .filter((spec) => spec.name),
  }
}

function valuesToInput(values: { value: string }[]) {
  return values.map((item) => item.value).filter(Boolean).join(', ')
}

function mergeCategoryDictionary(lists: SpecDictionaryItem[][]): SpecDictionaryItem[] {
  const byName = new Map<string, SpecDictionaryItem>()
  for (const list of lists) {
    for (const item of list) {
      if (!item.inCategory || !/[А-Яа-яЁё]/.test(item.name)) continue
      const existing = byName.get(item.name)
      if (!existing) {
        byName.set(item.name, {
          ...item,
          values: item.values.map((value) => ({ ...value })),
        })
        continue
      }
      existing.usageCount += item.usageCount
      const usage = new Map(existing.values.map((value) => [value.value, value.usageCount]))
      for (const value of item.values) {
        usage.set(value.value, (usage.get(value.value) ?? 0) + value.usageCount)
      }
      existing.values = [...usage.entries()]
        .map(([value, usageCount]) => ({ value, usageCount }))
        .sort((a, b) => b.usageCount - a.usageCount || a.value.localeCompare(b.value, 'ru'))
    }
  }
  return [...byName.values()].sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name, 'ru'))
}

function specFromDictionary(item: SpecDictionaryItem): DraftSpec {
  return {
    id: newId('spec'),
    name: item.name,
    values: valuesToInput(item.values),
  }
}

type SpecTemplatesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SpecTemplatesDialog({ open, onOpenChange }: SpecTemplatesDialogProps) {
  const [categories, setCategories] = useState<FlatCategory[]>([])
  const [drafts, setDrafts] = useState<DraftTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dictionary, setDictionary] = useState<SpecDictionaryItem[]>([])
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false)

  const selected = drafts.find((item) => item.id === selectedId) ?? drafts[0] ?? null
  const selectedCategoryKey = selected?.categoryIds.join(',') ?? ''

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIsLoading(true)
    Promise.all([specTemplatesApi.get(), categoriesApi.getTree()])
      .then(([templatesResponse, categoriesResponse]) => {
        if (cancelled) return
        const nextDrafts = (templatesResponse.data?.templates ?? []).map(toDraft)
        const ready = nextDrafts.length ? nextDrafts : [emptyTemplate()]
        setDrafts(ready)
        setSelectedId(ready[0].id)
        setCategories(flattenCategories(categoriesResponse.data ?? []))
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Не удалось загрузить шаблоны')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !selected?.categoryIds.length) {
      setDictionary([])
      setIsDictionaryLoading(false)
      return
    }
    let cancelled = false
    setIsDictionaryLoading(true)
    Promise.all(selected.categoryIds.map((categoryId) => productsApi.getSpecsDictionary(categoryId)))
      .then((responses) => {
        if (cancelled) return
        setDictionary(mergeCategoryDictionary(responses.map((response) => response.data?.specs ?? [])))
      })
      .catch(() => {
        if (!cancelled) setDictionary([])
      })
      .finally(() => {
        if (!cancelled) setIsDictionaryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, selectedCategoryKey])

  const selectedCategoriesLabel = useMemo(() => {
    if (!selected?.categoryIds.length) return 'Не выбраны — шаблон ищется по словам в названии категории'
    const names = categories
      .filter((category) => selected.categoryIds.includes(category.id))
      .map((category) => category.name)
    return names.length ? names.join(', ') : 'Категории выбраны'
  }, [categories, selected])

  const usedSpecNames = useMemo(
    () => new Set((selected?.specs ?? []).map((spec) => spec.name.trim()).filter(Boolean)),
    [selected],
  )

  const unusedFromCategory = useMemo(
    () => dictionary.filter((item) => !usedSpecNames.has(item.name)),
    [dictionary, usedSpecNames],
  )

  const updateSelected = (patch: Partial<DraftTemplate>) => {
    if (!selected) return
    setDrafts((prev) => prev.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)))
  }

  const updateSpec = (specId: string, patch: Partial<DraftSpec>) => {
    if (!selected) return
    updateSelected({
      specs: selected.specs.map((spec) => (spec.id === specId ? { ...spec, ...patch } : spec)),
    })
  }

  const addSpecsFromCategory = (items: SpecDictionaryItem[]) => {
    if (!selected || items.length === 0) return
    const missing = items.filter((item) => !usedSpecNames.has(item.name)).map(specFromDictionary)
    if (missing.length === 0) return
    const hasOnlyEmptyRow =
      selected.specs.length === 1 && !selected.specs[0].name.trim() && !selected.specs[0].values.trim()
    updateSelected({ specs: hasOnlyEmptyRow ? missing : [...selected.specs, ...missing] })
  }

  useEffect(() => {
    if (isDictionaryLoading || !dictionary.length || !selected) return
    const empty = selected.specs.every((spec) => !spec.name.trim() && !spec.values.trim())
    if (!empty) return
    addSpecsFromCategory(dictionary)
  }, [dictionary, isDictionaryLoading, selectedId])

  const nameGroupsFor = (currentName: string): SpecSuggestionGroup[] => {
    const occupied = new Set([...usedSpecNames].filter((name) => name !== currentName.trim()))
    const items = dictionary
      .filter((item) => !occupied.has(item.name))
      .map((item) => ({ value: item.name, hint: String(item.usageCount) }))
    if (!items.length) return []
    return [{ label: 'Уже в категории', items }]
  }

  const valueGroupsFor = (specName: string, currentValues: string): SpecSuggestionGroup[] => {
    const item = dictionary.find((entry) => entry.name === specName.trim())
    if (!item?.values.length) return []
    const used = new Set(
      currentValues
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    )
    const items = item.values
      .filter((value) => !used.has(value.value))
      .map((value) => ({ value: value.value, hint: String(value.usageCount) }))
    if (!items.length) return []
    return [{ label: 'Значения из товаров', items }]
  }

  const appendSpecValue = (specId: string, currentValues: string, nextValue: string) => {
    const parts = currentValues
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    if (parts.includes(nextValue)) {
      updateSpec(specId, { values: currentValues })
      return
    }
    updateSpec(specId, { values: parts.length ? `${parts.join(', ')}, ${nextValue}` : nextValue })
  }

  const toggleCategory = (categoryId: number, checked: boolean) => {
    if (!selected) return
    const next = checked
      ? [...selected.categoryIds, categoryId]
      : selected.categoryIds.filter((id) => id !== categoryId)
    updateSelected({ categoryIds: next })
  }

  const addTemplate = () => {
    const next = emptyTemplate()
    setDrafts((prev) => [...prev, next])
    setSelectedId(next.id)
  }

  const removeTemplate = (id: string) => {
    const next = drafts.filter((item) => item.id !== id)
    const ready = next.length ? next : [emptyTemplate()]
    setDrafts(ready)
    setSelectedId(selectedId === id ? ready[0].id : selectedId)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await specTemplatesApi.update(drafts.map(fromDraft))
      const saved = (response.data?.templates ?? []).map(toDraft)
      const ready = saved.length ? saved : [emptyTemplate()]
      setDrafts(ready)
      setSelectedId((current) => (ready.some((item) => item.id === current) ? current : ready[0].id))
      toast.success('Шаблоны характеристик сохранены')
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить шаблоны')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Шаблоны характеристик</DialogTitle>
          <DialogDescription>
            Набор полей для категории: при заполнении товара появится кнопка «Добавить шаблон». Шаблон
            действует на выбранную категорию и все вложенные.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col gap-2">
              <ScrollArea className="h-56 rounded-md border md:h-[28rem]">
                <div className="p-2 space-y-1">
                  {drafts.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm',
                        template.id === selected?.id ? 'bg-emerald-100 text-emerald-900' : 'hover:bg-muted',
                      )}
                      onClick={() => setSelectedId(template.id)}
                    >
                      <span className="line-clamp-2">{template.title || 'Без названия'}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <Button type="button" variant="outline" size="sm" onClick={addTemplate}>
                <Plus className="mr-1 h-4 w-4" />
                Новый шаблон
              </Button>
            </div>

            {selected && (
              <ScrollArea className="h-[32rem] rounded-md border">
                <div className="space-y-4 p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="spec-template-title">Название шаблона</Label>
                      <Input
                        id="spec-template-title"
                        value={selected.title}
                        onChange={(event) => updateSelected({ title: event.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6 text-destructive"
                      aria-label="Удалить шаблон"
                      onClick={() => removeTemplate(selected.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Категории</Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedCategoriesLabel}. Характеристики подтягиваются из уже заполненных товаров этой
                      категории и вложенных.
                    </p>
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                      {categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Сначала создайте категории</p>
                      ) : (
                        categories.map((category) => (
                          <label key={category.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                              checked={selected.categoryIds.includes(category.id)}
                              onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
                            />
                            <span style={{ paddingLeft: category.depth * 12 }}>
                              {category.depth > 0 ? '— ' : ''}
                              {category.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="spec-template-match">Ключевые слова</Label>
                    <Input
                      id="spec-template-match"
                      value={selected.match}
                      onChange={(event) => updateSelected({ match: event.target.value })}
                      placeholder="телевиз, tv"
                    />
                    <p className="text-xs text-muted-foreground">
                      Нужны, если категории не выбраны: шаблон подберётся, если слово есть в названии или slug.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Характеристики</Label>
                      <div className="flex flex-wrap justify-end gap-2">
                        {unusedFromCategory.length > 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => addSpecsFromCategory(unusedFromCategory)}
                          >
                            Из категории ({unusedFromCategory.length})
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateSelected({
                              specs: [...selected.specs, { id: newId('spec'), name: '', values: '' }],
                            })
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Поле
                        </Button>
                      </div>
                    </div>
                    {selected.categoryIds.length > 0 && isDictionaryLoading ? (
                      <p className="text-xs text-muted-foreground">Загружаю характеристики категории…</p>
                    ) : null}
                    {unusedFromCategory.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {unusedFromCategory.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            className="rounded-full border bg-muted/40 px-2 py-1 text-xs hover:bg-emerald-100"
                            onClick={() => addSpecsFromCategory([item])}
                          >
                            {item.name}
                            <span className="ml-1 text-muted-foreground">{item.usageCount}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selected.specs.map((spec) => (
                      <div key={spec.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
                        <SpecAutocomplete
                          value={spec.name}
                          onChange={(next) => {
                            const fromCategory = dictionary.find((item) => item.name === next.trim())
                            const fillValues = !spec.values.trim() && fromCategory
                            updateSpec(spec.id, {
                              name: next,
                              ...(fillValues ? { values: valuesToInput(fromCategory.values) } : {}),
                            })
                          }}
                          placeholder="Название"
                          groups={nameGroupsFor(spec.name)}
                          emptyText="Своё название или выберите из категории"
                        />
                        <SpecAutocomplete
                          value={spec.values}
                          onChange={(next) => {
                            const known = dictionary
                              .find((item) => item.name === spec.name.trim())
                              ?.values.some((item) => item.value === next)
                            const parts = spec.values
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean)
                            if (known && parts.length > 0 && !parts.includes(next) && next !== spec.values) {
                              appendSpecValue(spec.id, spec.values, next)
                              return
                            }
                            updateSpec(spec.id, { values: next })
                          }}
                          placeholder="Варианты через запятую"
                          groups={valueGroupsFor(spec.name, spec.values)}
                          emptyText="Свои варианты через запятую"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Удалить поле"
                          onClick={() =>
                            updateSelected({
                              specs: selected.specs.length > 1
                                ? selected.specs.filter((item) => item.id !== spec.id)
                                : [{ id: newId('spec'), name: '', values: '' }],
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
