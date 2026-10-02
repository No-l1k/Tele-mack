'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleHelp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpecAutocomplete, type SpecSuggestionGroup } from '@/components/admin/spec-autocomplete'
import { SpecHintEditor } from '@/components/admin/spec-hint-editor'
import { productsApi, specTemplatesApi, categoriesApi } from '@/lib/api'
import {
  categoryAncestorIds,
  resolveSpecTemplate,
  SPEC_TEMPLATES,
  type SpecTemplate,
} from '@/lib/product-spec-templates'
import { cn } from '@/lib/utils'
import type { Category, SpecDictionaryItem } from '@/types'

export type SpecRow = {
  id: string
  key: string
  value: string
  hint: string
}

function makeSpecRow(key = '', value = '', hint = ''): SpecRow {
  return {
    id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value,
    hint,
  }
}

function mergeUnique(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const next = value.trim()
    if (!next || seen.has(next)) continue
    seen.add(next)
    result.push(next)
  }
  return result
}

export function specHintsFromRows(rows: SpecRow[]): Record<string, string> {
  return Object.fromEntries(
    rows
      .map((row) => [row.key.trim(), row.hint.trim()] as const)
      .filter(([key]) => key.length > 0),
  )
}

type ProductSpecsEditorProps = {
  category?: Category | null
  rows: SpecRow[]
  onChange: (rows: SpecRow[]) => void
}

export function ProductSpecsEditor({ category, rows, onChange }: ProductSpecsEditorProps) {
  const [templates, setTemplates] = useState<SpecTemplate[]>(SPEC_TEMPLATES)
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const ancestorIds = useMemo(
    () => categoryAncestorIds(categoryTree, category?.id),
    [categoryTree, category?.id],
  )
  const template = resolveSpecTemplate(templates, category, ancestorIds)
  const definitions = template?.specs ?? []
  const [dictionary, setDictionary] = useState<SpecDictionaryItem[]>([])
  const [openHintId, setOpenHintId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    specTemplatesApi
      .get()
      .then((response) => {
        if (!cancelled && response.data?.templates?.length) {
          setTemplates(response.data.templates)
        }
      })
      .catch(() => {})
    categoriesApi
      .getTree()
      .then((response) => {
        if (!cancelled) setCategoryTree(response.data ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    productsApi
      .getSpecsDictionary(category?.id)
      .then((response) => {
        if (cancelled) return
        const specs = (response.data?.specs ?? []).filter((item) => /[А-Яа-яЁё]/.test(item.name))
        setDictionary(specs)
      })
      .catch(() => {
        if (!cancelled) setDictionary([])
      })
    return () => {
      cancelled = true
    }
  }, [category?.id])

  const usedKeys = useMemo(
    () => new Set(rows.map((row) => row.key.trim()).filter(Boolean)),
    [rows],
  )

  const hintByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of dictionary) {
      if (item.hint?.trim()) map.set(item.name, item.hint.trim())
    }
    return map
  }, [dictionary])

  const nameGroupsFor = (currentKey: string): SpecSuggestionGroup[] => {
    const occupied = new Set([...usedKeys].filter((name) => name !== currentKey.trim()))
    const groups: SpecSuggestionGroup[] = []
    const templateNames = mergeUnique(definitions.map((spec) => spec.name)).filter((name) => !occupied.has(name))
    if (templateNames.length) {
      groups.push({
        label: 'Шаблон категории',
        items: templateNames.map((name) => ({ value: name })),
      })
    }

    const inCategory = dictionary.filter(
      (item) => item.inCategory && !occupied.has(item.name) && !templateNames.includes(item.name),
    )
    if (inCategory.length) {
      groups.push({
        label: 'В этой категории',
        items: inCategory.map((item) => ({ value: item.name, hint: String(item.usageCount) })),
      })
    }

    const elsewhere = dictionary.filter(
      (item) => !item.inCategory && !occupied.has(item.name) && !templateNames.includes(item.name),
    )
    if (elsewhere.length) {
      groups.push({
        label: category ? 'В других товарах' : 'Уже в каталоге',
        items: elsewhere.map((item) => ({ value: item.name, hint: String(item.usageCount) })),
      })
    }

    return groups
  }

  const frequentNames = useMemo(() => {
    const templateNames = new Set(definitions.map((spec) => spec.name))
    return dictionary
      .filter((item) => item.inCategory && !usedKeys.has(item.name) && !templateNames.has(item.name))
      .map((item) => item.name)
  }, [definitions, dictionary, usedKeys])

  const addSpecRow = () => {
    onChange([...rows, makeSpecRow()])
  }

  const addTemplateRows = () => {
    if (!template) return
    const missingRows = template.specs
      .filter((spec) => !usedKeys.has(spec.name))
      .map((spec) => makeSpecRow(spec.name, '', hintByName.get(spec.name) ?? ''))

    if (missingRows.length === 0) return
    const hasOnlyEmptyRow = rows.length === 1 && !rows[0].key.trim() && !rows[0].value.trim()
    onChange(hasOnlyEmptyRow ? missingRows : [...rows, ...missingRows])
  }

  const addFrequentRows = () => {
    if (frequentNames.length === 0) return
    const missingRows = frequentNames.map((name) => makeSpecRow(name, '', hintByName.get(name) ?? ''))
    const hasOnlyEmptyRow = rows.length === 1 && !rows[0].key.trim() && !rows[0].value.trim()
    onChange(hasOnlyEmptyRow ? missingRows : [...rows, ...missingRows])
  }

  const updateSpecRow = (id: string, field: 'key' | 'value' | 'hint', nextValue: string) => {
    onChange(
      rows.map((row) => {
        if (row.id !== id) return row
        if (field === 'key') {
          const previousHint = hintByName.get(row.key.trim()) ?? ''
          const wasAutoFilled = !row.hint.trim() || row.hint.trim() === previousHint
          const nextHint = hintByName.get(nextValue.trim()) ?? ''
          return { ...row, key: nextValue, hint: wasAutoFilled ? nextHint : row.hint }
        }
        return { ...row, [field]: nextValue }
      }),
    )
  }

  const removeSpecRow = (id: string) => {
    const nextRows = rows.length > 1 ? rows.filter((row) => row.id !== id) : [makeSpecRow()]
    onChange(nextRows)
  }

  const valueGroupsFor = (key: string): SpecSuggestionGroup[] => {
    const name = key.trim()
    if (!name) return []
    const groups: SpecSuggestionGroup[] = []
    const definition = definitions.find((spec) => spec.name === name)
    const templateValues = mergeUnique(definition?.values ?? [])
    if (templateValues.length) {
      groups.push({
        label: 'Варианты шаблона',
        items: templateValues.map((value) => ({ value })),
      })
    }

    const learned = dictionary.find((item) => item.name === name)
    const extraValues = (learned?.values ?? []).filter((item) => !templateValues.includes(item.value))
    if (extraValues.length) {
      groups.push({
        label: 'Уже в каталоге',
        items: extraValues.map((item) => ({ value: item.value, hint: String(item.usageCount) })),
      })
    }

    return groups
  }

  return (
    <Card className="border-emerald-200/70 bg-emerald-50/30 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Характеристики</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Кнопка «?» открывает текст подсказки для покупателя. Enter делает новую строку, можно список и жирный.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {template && (
            <Button type="button" size="sm" variant="secondary" onClick={addTemplateRows}>
              Добавить шаблон
            </Button>
          )}
          {frequentNames.length > 0 && (
            <Button type="button" size="sm" variant="secondary" onClick={addFrequentRows}>
              Частые из категории
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={addSpecRow}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const hasHint = Boolean(row.hint.trim())
          const hintOpen = openHintId === row.id
          return (
            <div key={row.id} className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                <SpecAutocomplete
                  value={row.key}
                  onChange={(next) => updateSpecRow(row.id, 'key', next)}
                  placeholder="Название характеристики"
                  groups={nameGroupsFor(row.key)}
                />
                <SpecAutocomplete
                  value={row.value}
                  onChange={(next) => updateSpecRow(row.id, 'value', next)}
                  placeholder={row.key.trim() ? 'Значение' : 'Сначала выберите характеристику'}
                  groups={valueGroupsFor(row.key)}
                  emptyText={
                    row.key.trim()
                      ? 'Своё значение — после сохранения оно появится у других товаров'
                      : 'Сначала укажите название характеристики'
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(hasHint && 'text-amber-600')}
                  aria-label="Подсказка характеристики"
                  aria-pressed={hintOpen}
                  onClick={() => setOpenHintId(hintOpen ? null : row.id)}
                >
                  <CircleHelp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSpecRow(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {hintOpen && (
                <SpecHintEditor value={row.hint} onChange={(next) => updateSpecRow(row.id, 'hint', next)} />
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
