/**
 * Russian mobile display: +7 (999) 999-99-99
 * Accepts pasted digits, +7, 8..., 9... (mobile without country code).
 */

export function formatRuPhoneMask(input: string): string {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length > 0 && !d.startsWith('7')) {
    if (/^9\d{0,9}$/.test(d)) d = '7' + d
    else d = '7' + d.replace(/^7+/, '')
  }
  d = d.slice(0, 11)
  if (!d.length) return ''

  const r = d.slice(1)
  let out = '+7'
  if (!r.length) return out
  out += ' (' + r.slice(0, 3)
  if (r.length <= 3) return out
  out += ') ' + r.slice(3, 6)
  if (r.length <= 6) return out
  out += '-' + r.slice(6, 8)
  if (r.length <= 8) return out
  out += '-' + r.slice(8, 10)
  return out
}

/** 11 digits starting with 7, or shorter while typing */
export function ruPhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function isCompleteRuPhone(value: string): boolean {
  const digits = ruPhoneDigits(value)
  return digits.length === 11 && digits.startsWith('7')
}
