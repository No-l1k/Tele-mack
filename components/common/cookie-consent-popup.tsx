'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const COOKIE_CONSENT_KEY = 'cookie_consent_accepted_v1'

export function CookieConsentPopup() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const accepted = window.localStorage.getItem(COOKIE_CONSENT_KEY) === '1'
      setIsOpen(!accepted)
    } catch {
      setIsOpen(true)
    }
  }, [])

  const accept = () => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, '1')
    } catch {
      // noop: if storage is unavailable, just hide popup for current session
    }
    setIsOpen(false)
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[80] w-[min(92vw,24rem)] overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-2xl">
      <div className="px-6 py-6 text-center">
        <h3 className="text-3xl font-semibold">Cookie</h3>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Сайт использует cookie. Вы можете отказаться от использования cookie, изменив настройки в браузере.
          Используя сайт, вы соглашаетесь на обработку персональных данных на условиях Политики.
        </p>
      </div>
      <div className="grid grid-cols-2 border-t">
        <Link
          href="/privacy"
          className="flex h-14 items-center justify-center border-r text-base font-medium transition-colors hover:bg-muted"
        >
          Политика
        </Link>
        <button
          type="button"
          onClick={accept}
          className="h-14 bg-primary text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          OK
        </button>
      </div>
    </div>,
    document.body
  )
}
