const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/**
 * Нормализация при вводе: не убираем дефис в конце/начале строки,
 * иначе нельзя напечатать «canon-» — последний символ сразу стирался.
 */
export function normalizeProductSlugInput(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN_MAP[char] ?? char)
    .join('')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
}

/**
 * Финальная нормализация перед отправкой в API.
 */
export function normalizeProductSlug(value: string): string {
  return normalizeProductSlugInput(value).replace(/^-+|-+$/g, '')
}
