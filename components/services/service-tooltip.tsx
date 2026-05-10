'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ServiceTooltipProps {
  text: string
  className?: string
}

/** Прозрачный круг с «?» — подробности услуги во всплывающей подсказке. */
export function ServiceTooltip({ text, className }: ServiceTooltipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full',
            'border border-muted-foreground/35 bg-background/45 text-[11px] font-semibold leading-none text-muted-foreground',
            'backdrop-blur-[2px] transition-colors hover:border-muted-foreground/55 hover:bg-background/70',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className
          )}
          aria-label="Подробнее об услуге"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={10}
        className={cn(
          'z-50 max-w-[min(42rem,calc(100vw-2rem))] border px-4 py-3.5 text-left shadow-lg',
          'border-zinc-200/90 bg-zinc-100 text-zinc-900',
          'text-sm leading-relaxed',
          'dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50',
          '[&>svg]:hidden'
        )}
      >
        <p className="whitespace-pre-line">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}
