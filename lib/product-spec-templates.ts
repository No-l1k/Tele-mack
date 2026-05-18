import type { Category } from '@/types'

export type SpecDefinition = {
  name: string
  values?: string[]
}

export type SpecTemplate = {
  title: string
  match: string[]
  specs: SpecDefinition[]
}

export const YES_NO_SPEC_VALUES = ['есть', 'нет'] as const

export const SPEC_TEMPLATES: SpecTemplate[] = [
  {
    title: 'Телевизоры',
    match: ['телевиз', 'tv', 'tvs', 'televizor'],
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
    title: 'Кронштейны',
    match: ['кронштейн', 'bracket', 'mount', 'holder'],
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
    title: 'Саундбары',
    match: ['саундбар', 'soundbar'],
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

export function getSpecTemplate(category?: Pick<Category, 'name' | 'slug'> | null): SpecTemplate | null {
  if (!category) return null
  const haystack = normalizeForCategoryMatch(`${category.name} ${category.slug}`)
  return SPEC_TEMPLATES.find((template) => template.match.some((keyword) => haystack.includes(keyword))) ?? null
}

export function orderFacetValues(definition: SpecDefinition, available: Set<string>): string[] {
  if (definition.values?.length) {
    const ordered = definition.values.filter((value) => available.has(value))
    const extras = [...available].filter((value) => !definition.values!.includes(value)).sort((a, b) => a.localeCompare(b, 'ru'))
    return [...ordered, ...extras]
  }
  return [...available].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
}
