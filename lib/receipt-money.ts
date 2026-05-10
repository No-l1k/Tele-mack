/** Формат сумм как на печатном чеке: «580 004.00 руб» */
export function formatReceiptRub(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2)
  const [intPart, frac] = fixed.split('.')
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = amount < 0 ? '−' : ''
  return `${sign}${withSpaces}.${frac} руб`
}
