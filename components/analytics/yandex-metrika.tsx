'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

const METRIKA_SCRIPT_SRC = (id: number) =>
  `https://mc.yandex.ru/metrika/tag.js?id=${id}`

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
    dataLayer?: Record<string, unknown>[]
  }
}

function parseMetrikaCounterId(raw: string | undefined): number | null {
  if (!raw?.trim()) return null
  const id = Number(raw.trim())
  return Number.isFinite(id) && id > 0 ? id : null
}

function YandexMetrikaPageView({ counterId }: { counterId: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    if (typeof window.ym === 'function') {
      window.ym(counterId, 'hit', url)
    }
  }, [pathname, searchParams, counterId])

  return null
}

type YandexMetrikaProps = {
  counterId: number
}

export function YandexMetrika({ counterId }: YandexMetrikaProps) {
  return (
    <>
      <Script id="yandex-metrika-loader" strategy="afterInteractive">
        {`
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document, 'script', '${METRIKA_SCRIPT_SRC(counterId)}', 'ym');
        `}
      </Script>
      <Script id="yandex-metrika-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
ym(${counterId}, 'init', {
  ssr: true,
  webvisor: true,
  clickmap: true,
  ecommerce: 'dataLayer',
  accurateTrackBounce: true,
  trackLinks: true
});
        `}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${counterId}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
      <Suspense fallback={null}>
        <YandexMetrikaPageView counterId={counterId} />
      </Suspense>
    </>
  )
}

export function YandexMetrikaFromEnv() {
  const counterId = parseMetrikaCounterId(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID)
  if (!counterId) return null
  return <YandexMetrika counterId={counterId} />
}
