'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function SpecHintBody({ text }: { text: string }) {
  const blocks: Array<{ type: 'p' | 'ul'; lines: string[] }> = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd()
    const bullet = line.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)$/)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ul') last.lines.push(bullet[1])
      else blocks.push({ type: 'ul', lines: [bullet[1]] })
      continue
    }
    if (!line.trim()) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'p') continue
      continue
    }
    const last = blocks[blocks.length - 1]
    if (last?.type === 'p') last.lines.push(line.trim())
    else blocks.push({ type: 'p', lines: [line.trim()] })
  }

  return (
    <div className="space-y-2 text-sm leading-5 text-foreground">
      {blocks.map((block, index) =>
        block.type === 'ul' ? (
          <ul key={index} className="list-disc space-y-1 pl-4">
            {block.lines.map((line, lineIndex) => (
              <li key={lineIndex}>{renderInline(line)}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{renderInline(block.lines.join(' '))}</p>
        ),
      )}
    </div>
  )
}

type SpecHintPopoverProps = {
  specName: string
  hint: string
}

export function SpecHintPopover({ specName, hint }: SpecHintPopoverProps) {
  if (!hint.trim()) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            'bg-amber-500 text-[11px] font-bold leading-none text-white shadow-sm',
            'hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
          )}
          aria-label={`Подсказка: ${specName}`}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-[min(22rem,calc(100vw-2rem))] p-4">
        <SpecHintBody text={hint} />
      </PopoverContent>
    </Popover>
  )
}
