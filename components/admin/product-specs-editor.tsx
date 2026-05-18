'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getSpecTemplate } from '@/lib/product-spec-templates'
import type { Category } from '@/types'

export type SpecRow = {
  id: string
  key: string
  value: string
}

const CUSTOM_SPEC_VALUE = '__custom_spec__'

function makeSpecRow(key = '', value = ''): SpecRow {
  return {
    id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value,
  }
}

type ProductSpecsEditorProps = {
  category?: Category | null
  rows: SpecRow[]
  onChange: (rows: SpecRow[]) => void
}

export function ProductSpecsEditor({ category, rows, onChange }: ProductSpecsEditorProps) {
  const template = getSpecTemplate(category)
  const definitions = template?.specs ?? []

  const addSpecRow = () => {
    onChange([...rows, makeSpecRow()])
  }

  const addTemplateRows = () => {
    if (!template) return
    const existingKeys = new Set(rows.map((row) => row.key.trim()).filter(Boolean))
    const missingRows = template.specs
      .filter((spec) => !existingKeys.has(spec.name))
      .map((spec) => makeSpecRow(spec.name))

    if (missingRows.length === 0) return
    const hasOnlyEmptyRow = rows.length === 1 && !rows[0].key.trim() && !rows[0].value.trim()
    onChange(hasOnlyEmptyRow ? missingRows : [...rows, ...missingRows])
  }

  const updateSpecRow = (id: string, field: 'key' | 'value', nextValue: string) => {
    onChange(
      rows.map((row) => {
        if (row.id !== id) return row

        if (field === 'key') {
          const definition = definitions.find((spec) => spec.name === nextValue)
          const nextRow = { ...row, key: nextValue }
          if (definition?.values?.length && !definition.values.includes(row.value)) {
            nextRow.value = ''
          }
          return nextRow
        }

        return { ...row, value: nextValue }
      })
    )
  }

  const removeSpecRow = (id: string) => {
    const nextRows = rows.length > 1 ? rows.filter((row) => row.id !== id) : [makeSpecRow()]
    onChange(nextRows)
  }

  return (
    <Card className="border-emerald-200/70 bg-emerald-50/30 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Характеристики</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {template
              ? `Шаблон: ${template.title}. Выберите характеристику и заполните значение.`
              : 'Для этой категории шаблона пока нет — можно заполнить характеристики вручную.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {template && (
            <Button type="button" size="sm" variant="secondary" onClick={addTemplateRows}>
              Добавить шаблон
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
          const selectedDefinition = definitions.find((spec) => spec.name === row.key)
          const usesCustomKey = Boolean(template && row.key && !selectedDefinition)
          const shouldShowCustomKeyInput = !template || usesCustomKey

          return (
            <div key={row.id} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="space-y-2">
                {template && (
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={usesCustomKey ? CUSTOM_SPEC_VALUE : row.key}
                    onChange={(event) => {
                      const nextKey = event.target.value === CUSTOM_SPEC_VALUE ? '' : event.target.value
                      updateSpecRow(row.id, 'key', nextKey)
                    }}
                  >
                    <option value="">Выберите характеристику</option>
                    {definitions.map((spec) => (
                      <option key={spec.name} value={spec.name}>
                        {spec.name}
                      </option>
                    ))}
                    <option value={CUSTOM_SPEC_VALUE}>Другая характеристика</option>
                  </select>
                )}
                {shouldShowCustomKeyInput && (
                  <Input
                    placeholder="Название характеристики"
                    value={row.key}
                    onChange={(event) => updateSpecRow(row.id, 'key', event.target.value)}
                  />
                )}
              </div>
              {selectedDefinition?.values?.length ? (
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={row.value}
                  onChange={(event) => updateSpecRow(row.id, 'value', event.target.value)}
                >
                  <option value="">Выберите значение</option>
                  {selectedDefinition.values.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                  {row.value && !selectedDefinition.values.includes(row.value) && (
                    <option value={row.value}>{row.value}</option>
                  )}
                </select>
              ) : (
                <Input
                  placeholder="Значение"
                  value={row.value}
                  onChange={(event) => updateSpecRow(row.id, 'value', event.target.value)}
                />
              )}
              <Button type="button" variant="ghost" size="icon" onClick={() => removeSpecRow(row.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
