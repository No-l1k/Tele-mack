'use client'

import Script from 'next/script'

const JIVO_WIDGET_ID =
  process.env.NEXT_PUBLIC_JIVO_WIDGET_ID?.trim() || 'DVV6Dx46n2'

export function JivoChat() {
  return (
    <Script
      id="jivo-chat"
      src={`https://code.jivo.ru/widget/${JIVO_WIDGET_ID}`}
      strategy="afterInteractive"
    />
  )
}
