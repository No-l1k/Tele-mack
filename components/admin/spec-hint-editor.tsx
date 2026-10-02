'use client'

import { useRef } from 'react'
import { Bold, List, Pilcrow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SpecHintBody } from '@/components/product/spec-hint-popover'

type SpecHintEditorProps = {
  value: string
  onChange: (value: string) => void
}

function applyInTextarea(
  element: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  nextValue: string,
  cursorStart: number,
  cursorEnd = cursorStart,
) {
  onChange(nextValue)
  requestAnimationFrame(() => {
    element.focus()
    element.setSelectionRange(cursorStart, cursorEnd)
  })
}

export function SpecHintEditor({ value, onChange }: SpecHintEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wrapBold = () => {
    const element = textareaRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    if (start === end) return
    const selected = value.slice(start, end)
    applyInTextarea(
      element,
      value,
      onChange,
      `${value.slice(0, start)}**${selected}**${value.slice(end)}`,
      start + 2,
      end + 2,
    )
  }

  const insertParagraph = () => {
    const element = textareaRef.current
    if (!element) return
    const start = element.selectionStart
    const insert = value.slice(0, start).endsWith('\n') ? '\n' : '\n\n'
    applyInTextarea(element, value, onChange, `${value.slice(0, start)}${insert}${value.slice(start)}`, start + insert.length)
  }

  const insertListItem = () => {
    const element = textareaRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    if (start !== end) {
      const selected = value.slice(start, end)
      const listed = selected
        .split('\n')
        .map((line) => {
          const trimmed = line.trim()
          if (!trimmed) return line
          return /^\s*(?:[-•*]|\d+\.)\s+/.test(line) ? line : `- ${trimmed}`
        })
        .join('\n')
      applyInTextarea(element, value, onChange, `${value.slice(0, start)}${listed}${value.slice(end)}`, start, start + listed.length)
      return
    }
    const prefix = start === 0 || value[start - 1] === '\n' ? '- ' : '\n- '
    applyInTextarea(element, value, onChange, `${value.slice(0, start)}${prefix}${value.slice(start)}`, start + prefix.length)
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={wrapBold}>
          <Bold className="mr-1 h-4 w-4" />
          Жирный
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={insertListItem}>
          <List className="mr-1 h-4 w-4" />
          Список
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={insertParagraph}>
          <Pilcrow className="mr-1 h-4 w-4" />
          Абзац
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">Enter — новая строка. Ctrl+B — жирный.</p>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
            event.preventDefault()
            wrapBold()
          }
        }}
        placeholder={'Подсветка освещает матрицу сзади или по краям.\n\n- **QD-Mini LED** — мини-светодиоды плюс квантовые точки\n- **Mini LED** — много мелких светодиодов за экраном'}
        className="min-h-36 whitespace-pre-wrap bg-background"
      />
      {value.trim() ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Как увидит покупатель</p>
          <SpecHintBody text={value} />
        </div>
      ) : null}
    </div>
  )
}
