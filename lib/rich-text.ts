const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i

export function hasHtmlMarkup(value: string): boolean {
  return HTML_TAG_PATTERN.test(value)
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function plainTextToRichHtml(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('')
}

export function prepareDescriptionHtml(value: string): string {
  if (!value.trim()) return ''
  if (hasHtmlMarkup(value)) return value
  return plainTextToRichHtml(value)
}

export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ')
}

export function htmlToText(value: string): string {
  const withBreaks = value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\/\s*section\s*>/gi, '\n\n')
    .replace(/<\/\s*figure\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
  const stripped = stripHtmlTags(withBreaks)
  return stripped
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function sanitizeDescriptionHtml(value: string): string {
  if (!value.trim()) return ''
  if (typeof window === 'undefined') return value

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${value}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''

  const allowedTags = new Set([
    'DIV',
    'SECTION',
    'FIGURE',
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'UL',
    'OL',
    'LI',
    'IMG',
  ])

  const isSafeImageSrc = (src: string): boolean => {
    const value = src.trim().toLowerCase()
    return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')
  }

  const sanitizeNode = (node: Node) => {
    if (!(node instanceof Element)) return

    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || ''
      const alt = node.getAttribute('alt') || ''
      Array.from(node.attributes).forEach((attribute) => {
        node.removeAttribute(attribute.name)
      })
      if (!isSafeImageSrc(src)) {
        node.remove()
        return
      }
      node.setAttribute('src', src)
      if (alt) node.setAttribute('alt', alt)
      node.setAttribute('loading', 'lazy')
      node.setAttribute('decoding', 'async')
    } else {
      Array.from(node.attributes).forEach((attribute) => {
        node.removeAttribute(attribute.name)
      })
    }

    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element
        if (!allowedTags.has(element.tagName)) {
          const textNode = doc.createTextNode(element.textContent || '')
          node.replaceChild(textNode, child)
          return
        }
      }
      sanitizeNode(child)
    })
  }

  sanitizeNode(root)

  root.querySelectorAll('figure').forEach((figure) => {
    const img = figure.querySelector('img')
    const src = img?.getAttribute('src')?.trim() || ''
    if (!img || !isSafeImageSrc(src)) {
      figure.remove()
    }
  })

  return root.innerHTML
}
