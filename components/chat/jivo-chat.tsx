'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const JIVO_WIDGET_ID =
  process.env.NEXT_PUBLIC_JIVO_WIDGET_ID?.trim() || 'DVV6Dx46n2'

function setJivoVisible(visible: boolean) {
  document.querySelectorAll('jdiv').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.display = visible ? '' : 'none'
    }
  })
}

export function JivoChat() {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  useEffect(() => {
    setJivoVisible(!isAdmin)
  }, [isAdmin])

  if (isAdmin) {
    return null
  }

  return (
    <Script
      id="jivo-chat"
      src={`https://code.jivo.ru/widget/${JIVO_WIDGET_ID}`}
      strategy="afterInteractive"
    />
  )
}
