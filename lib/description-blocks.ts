import { escapeHtml, hasHtmlMarkup, htmlToText, plainTextToRichHtml } from '@/lib/rich-text'

export type DescriptionBlock =
  | {
      id: string
      type: 'section'
      title: string
      text: string
    }
  | {
      id: string
      type: 'image'
      src: string
      alt: string
    }

type SectionBlock = Extract<DescriptionBlock, { type: 'section' }>
type ImageBlock = Extract<DescriptionBlock, { type: 'image' }>

function textWithBoldToHtml(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
}

function sectionTextToHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${textWithBoldToHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('')
}

function paragraphToEditorText(paragraph: Element): string {
  if (typeof window === 'undefined') return paragraph.textContent?.trim() || ''
  const marked = paragraph.innerHTML
    .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<br\s*\/?>/gi, '\n')

  const temp = document.createElement('div')
  temp.innerHTML = marked
  return (temp.textContent || '').trim()
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSectionBlock(): SectionBlock {
  return { id: createId('section'), type: 'section', title: '', text: '' }
}

export function createImageBlock(): ImageBlock {
  return { id: createId('image'), type: 'image', src: '', alt: '' }
}

export function parseDescriptionBlocks(raw: string): DescriptionBlock[] {
  const value = raw.trim()
  if (!value) return [createSectionBlock()]
  if (typeof window === 'undefined') return [createSectionBlock()]

  if (!hasHtmlMarkup(value)) {
    return [{ id: createId('section'), type: 'section', title: '', text: value }]
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  const root = doc.querySelector('[data-description-blocks="1"]') ?? doc.body
  const sectionNodes = Array.from(root.querySelectorAll('[data-description-section="1"]'))
  const imageNodes = Array.from(root.querySelectorAll('[data-description-image="1"]'))

  if (sectionNodes.length === 0 && imageNodes.length === 0) {
    const fallbackText = htmlToText(value)
    return [{ id: createId('section'), type: 'section', title: '', text: fallbackText }]
  }

  const items: DescriptionBlock[] = []
  Array.from(root.children).forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.matches('[data-description-section="1"]')) {
      const title = node.querySelector('h2')?.textContent?.trim() || ''
      const paragraphs = Array.from(node.querySelectorAll('p'))
        .map((paragraph) => paragraphToEditorText(paragraph))
        .filter(Boolean)
      items.push({
        id: createId('section'),
        type: 'section',
        title,
        text: paragraphs.join('\n\n'),
      })
      return
    }
    if (node.matches('[data-description-image="1"]')) {
      const img = node.querySelector('img')
      const idAttr = node.getAttribute('data-image-block-id')
      const altFromData = node.getAttribute('data-alt') || ''
      items.push({
        id: idAttr && idAttr.trim() ? idAttr.trim() : createId('image'),
        type: 'image',
        src: img?.getAttribute('src')?.trim() || '',
        alt: img?.getAttribute('alt')?.trim() || altFromData.trim() || '',
      })
    }
  })

  return items.length > 0 ? items : [createSectionBlock()]
}

export function serializeDescriptionBlocks(items: DescriptionBlock[]): string {
  const chunks: string[] = []
  items.forEach((item) => {
    if (item.type === 'section') {
      const hasContent = item.title.trim().length > 0 || item.text.trim().length > 0
      if (!hasContent) return
      const titleHtml = item.title.trim() ? `<h2>${escapeHtml(item.title.trim())}</h2>` : ''
      const textHtml = sectionTextToHtml(item.text) || plainTextToRichHtml(item.text)
      chunks.push(`<section data-description-section="1">${titleHtml}${textHtml}</section>`)
      return
    }
    const idAttr = ` data-image-block-id="${escapeHtml(item.id)}"`
    const altEsc = escapeHtml(item.alt.trim())
    const src = item.src.trim()
    if (!src) {
      chunks.push(
        `<figure data-description-image="1"${idAttr} data-image-pending="1" data-alt="${altEsc}"></figure>`,
      )
      return
    }
    chunks.push(
      `<figure data-description-image="1"${idAttr}><img src="${escapeHtml(src)}" alt="${altEsc}" loading="lazy" decoding="async"></figure>`,
    )
  })

  if (chunks.length === 0) return ''
  return `<div data-description-blocks="1">${chunks.join('')}</div>`
}

/**
 * После создания товара подставляет URL загруженных файлов в figure по data-image-block-id.
 */
export function injectUploadedImageUrls(html: string, urlsByBlockId: Record<string, string>): string {
  if (typeof window === 'undefined') return html
  const trimmed = html.trim()
  if (!trimmed || Object.keys(urlsByBlockId).length === 0) return html

  const wrapped = trimmed.includes('data-description-blocks')
    ? trimmed
    : `<div data-description-blocks="1">${trimmed}</div>`
  const parser = new DOMParser()
  const doc = parser.parseFromString(wrapped, 'text/html')
  const root = doc.querySelector('[data-description-blocks="1"]')
  if (!root) return html

  root.querySelectorAll('figure[data-description-image="1"]').forEach((figure) => {
    const blockId = figure.getAttribute('data-image-block-id')
    if (!blockId) return
    const url = urlsByBlockId[blockId]
    if (!url?.trim()) return
    const alt = figure.getAttribute('data-alt') || ''
    figure.innerHTML = `<img src="${escapeHtml(url.trim())}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`
    figure.removeAttribute('data-image-pending')
    figure.removeAttribute('data-alt')
  })

  return root.outerHTML
}
