import type { JsonLd } from '@/lib/json-ld'

type JsonLdScriptProps = {
  data: JsonLd | JsonLd[]
}

/**
 * Встраивает schema.org разметку в страницу (рекомендация Google / Яндекс).
 * Рендерится на сервере, без client JS.
 */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  const payload = Array.isArray(data) ? data : [data]

  return (
    <>
      {payload.map((graph, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
    </>
  )
}
