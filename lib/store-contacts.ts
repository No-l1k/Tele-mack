/** Телефоны магазина (отображение и tel: / мессенджеры). */
export type StorePhone = {
  digits: string
  tel: string
  display: string
  displayCompact: string
}

export const STORE_PHONES: readonly StorePhone[] = [
  {
    digits: '79268023497',
    tel: '+79268023497',
    display: '+7 (926) 802-34-97',
    displayCompact: '+7(926)802-34-97',
  },
  {
    digits: '74952083945',
    tel: '+74952083945',
    display: '+7 (495) 208-39-45',
    displayCompact: '+7(495)208-39-45',
  },
] as const

export const STORE_PHONE_PRIMARY = STORE_PHONES[0]
export const STORE_WHATSAPP_DIGITS = STORE_PHONE_PRIMARY.digits

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Строка для политики, SEO, ошибок — с учётом телефона из настроек админки. */
export function storePhonesContactLine(adminPhone?: string | null): string {
  const seen = new Set<string>()
  const lines: string[] = []
  const add = (text: string) => {
    const key = digitsOnly(text)
    if (!key || seen.has(key)) return
    seen.add(key)
    lines.push(text.trim())
  }
  if (adminPhone?.trim()) add(adminPhone.trim())
  for (const phone of STORE_PHONES) add(phone.display)
  return lines.join(' · ')
}

export function organizationTelephones(adminPhone?: string | null): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  const add = (tel: string) => {
    const key = digitsOnly(tel)
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(tel)
  }
  if (adminPhone?.trim()) add(adminPhone.trim())
  for (const phone of STORE_PHONES) add(phone.tel)
  return result
}
