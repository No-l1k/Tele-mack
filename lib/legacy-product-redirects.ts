/**
 * Редиректы со старых URL (другая вёрстка / marketplace) на актуальные страницы.
 *
 * Ключ — путь без домена, как в Next.js (например `/product/televizor-lg-oled48g5la-oled-4k-uhd-2025`).
 * Значение — куда вести: новый путь товара (`/product/новый-slug`) или `/catalog`.
 *
 * После деплоя добавьте сюда известные соответствия. Редиректы подхватывает middleware.ts.
 *
 * Примеры битых URL из старого индекса (цель — редирект или 404 после notFound на странице товара):
 * - /product/televizor-lg-oled48g5la-oled-4k-uhd-2025
 * - /product/televizor-sony-k-65xr8a-oled-4k-2025
 * - /product/televizor-sony-bravia-k-65xr90-2024-mini-led-4k-uhd
 * …добавьте по мере нахождения актуального slug в админке.
 */

export type LegacyRedirectMap = Record<string, string>

/** Нормализует путь для поиска в карте (без хвостового слэша, lowercase опционально). */
export function normalizeLegacyPath(pathname: string): string {
  let path = pathname.trim()
  if (!path.startsWith('/')) path = `/${path}`
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

const LEGACY_PRODUCT_REDIRECTS: LegacyRedirectMap = {
  '/product/televizor-sony-k-65xr8a-oled-4k-2025':
    '/product/televizor-sony-k-65xr8a-oled-4k-uhd',
  '/product/televizor-sony-bravia-k-65xr90-2024-mini-led-4k-uhd':
    '/product/televizor-sony-k-65xr90-4k-uhd-va-miniled',
  '/product/televizor-samsung-114-micro-led-ms1-mna114ms1ccxru-2023':
    '/product/samsung-mna114ms1cc',
  '/product/televizor-samsung-qe55qn70fau-neo-qled-4k-smart-tv-2025':
    '/product/televizor-samsung-qe55qn70f',
}

export function getLegacyProductRedirects(): LegacyRedirectMap {
  return LEGACY_PRODUCT_REDIRECTS
}

export function resolveLegacyProductRedirect(pathname: string): string | null {
  const normalized = normalizeLegacyPath(pathname)
  return LEGACY_PRODUCT_REDIRECTS[normalized] ?? null
}