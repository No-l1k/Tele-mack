import type { Category } from '@/types'

export type SpecDefinition = {
  name: string
  values?: string[]
}

export type SpecTemplate = {
  id?: string
  title: string
  match: string[]
  categoryIds?: number[]
  specs: SpecDefinition[]
}

export const YES_NO_SPEC_VALUES = ['есть', 'нет'] as const

export const SPEC_TEMPLATES: SpecTemplate[] = [
  {
    id: 'default-1',
    title: 'Телевизоры',
    match: ['телевиз', 'tv', 'tvs', 'televizor'],
    categoryIds: [],
    specs: [
      { name: 'Диагональ экрана (дюйм)' },
      { name: 'Поддержка Smart TV', values: [...YES_NO_SPEC_VALUES] },
      { name: 'Разрешение экрана', values: ['4K Ultra HD', '8K Ultra HD', 'Full HD', 'HD-Ready'] },
      { name: 'Частота обновления экрана', values: ['100 Гц', '120 Гц', '144 Гц', '165 Гц', '60 Гц'] },
      {
        name: 'Операционная система',
        values: ['Android', 'Google TV', 'HomeOS', 'Tizen', 'VIDAA', 'YaOS', 'webOS', 'Салют ТВ'],
      },
    ],
  },
  {
    id: 'default-2',
    title: 'Кронштейны',
    match: ['кронштейн', 'bracket', 'mount', 'holder'],
    categoryIds: [],
    specs: [
      { name: 'Назначение кронштейна', values: ['для AV-оборудования', 'для мониторов', 'для телевизоров'] },
      { name: 'Место крепления кронштейна', values: ['потолок', 'стена', 'стол'] },
      {
        name: 'Тип кронштейна',
        values: ['наклонно-поворотный', 'наклонный', 'поворотный', 'полка', 'потолочный', 'стойка', 'фиксированный'],
      },
    ],
  },
  {
    id: 'default-3',
    title: 'Саундбары',
    match: ['саундбар', 'soundbar'],
    categoryIds: [],
    specs: [
      { name: 'Суммарная мощность', values: ['до 100 Вт', 'от 101 до 200 Вт', 'от 201 до 390 Вт', 'от 400 Вт'] },
      { name: 'Bluetooth', values: [...YES_NO_SPEC_VALUES] },
      { name: 'Wi-Fi', values: [...YES_NO_SPEC_VALUES] },
      { name: 'USB-порт', values: [...YES_NO_SPEC_VALUES] },
      { name: 'HDMI', values: [...YES_NO_SPEC_VALUES] },
      { name: 'NFC', values: [...YES_NO_SPEC_VALUES] },
      { name: 'Беспроводной сабвуфер', values: [...YES_NO_SPEC_VALUES] },
    ],
  },
]

export function normalizeForCategoryMatch(value: string) {
  return value.trim().replace(/ё/g, 'е').toLocaleLowerCase('ru-RU')
}

export function categoryAncestorIds(
  categories: Category[],
  categoryId?: string | number | null,
): number[] {
  const parentById = new Map<string, string>()
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      if (node.parentId != null && String(node.parentId)) {
        parentById.set(String(node.id), String(node.parentId))
      }
      if (node.children?.length) walk(node.children)
    }
  }
  walk(categories)

  const ids: number[] = []
  let current = categoryId != null && String(categoryId) ? String(categoryId) : ''
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const numeric = Number(current)
    if (Number.isFinite(numeric) && numeric > 0) ids.push(numeric)
    current = parentById.get(current) ?? ''
  }
  return ids
}

export function resolveSpecTemplate(
  templates: SpecTemplate[],
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null,
  ancestorIds: Array<string | number> = [],
): SpecTemplate | null {
  if (!category) return null
  const chain = ancestorIds.length
    ? ancestorIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
    : [Number(category.id)].filter((id) => Number.isFinite(id) && id > 0)
  for (const categoryId of chain) {
    const bound = templates.find((template) => (template.categoryIds ?? []).includes(categoryId))
    if (bound) return bound
  }
  const haystack = normalizeForCategoryMatch(`${category.name} ${category.slug}`)
  if (!haystack) return null
  return templates.find((template) => template.match.some((keyword) => haystack.includes(keyword))) ?? null
}

export function getSpecTemplate(category?: Pick<Category, 'id' | 'name' | 'slug'> | null): SpecTemplate | null {
  return resolveSpecTemplate(SPEC_TEMPLATES, category)
}

export function orderFacetValues(definition: SpecDefinition, available: Set<string>): string[] {
  if (definition.values?.length) {
    const ordered = definition.values.filter((value) => available.has(value))
    const extras = [...available].filter((value) => !definition.values!.includes(value)).sort((a, b) => a.localeCompare(b, 'ru'))
    return [...ordered, ...extras]
  }
  return [...available].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
}
