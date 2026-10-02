'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SpecSuggestion = {
  value: string
  hint?: string
}

export type SpecSuggestionGroup = {
  label: string
  items: SpecSuggestion[]
}

type SpecAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  groups: SpecSuggestionGroup[]
  emptyText?: string
}

function matchesQuery(value: string, query: string) {
  if (!query) return true
  return value.toLocaleLowerCase('ru-RU').includes(query)
}

export function SpecAutocomplete({
  value,
  onChange,
  placeholder,
  groups,
  emptyText = 'Ничего не найдено — можно ввести своё',
}: SpecAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [menuWidth, setMenuWidth] = useState<number>()
  const anchorRef = useRef<HTMLDivElement>(null)

  const syncMenuWidth = () => {
    const width = anchorRef.current?.offsetWidth
    if (width) setMenuWidth(width)
  }

  const query = value.trim().toLocaleLowerCase('ru-RU')
  const hasExactMatch = groups.some((group) => group.items.some((item) => item.value === value.trim()))

  const visibleGroups = useMemo(() => {
    return groups
      .map((group) => ({
        ...group,
        items: hasExactMatch || !query ? group.items : group.items.filter((item) => matchesQuery(item.value, query)),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, hasExactMatch, query])

  const flatItems = visibleGroups.flatMap((group) => group.items.map((item) => item.value))

  const selectValue = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault()
      const selected = flatItems[highlight]
      if (selected) selectValue(selected)
      else setOpen(false)
      return
    }
    if (!flatItems.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlight((index) => (index + 1) % flatItems.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setHighlight((index) => (index - 1 + flatItems.length) % flatItems.length)
    }
  }

  let optionIndex = -1

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Input
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            onFocus={() => {
              syncMenuWidth()
              setOpen(true)
              setHighlight(0)
            }}
            onChange={(event) => {
              onChange(event.target.value)
              setOpen(true)
              setHighlight(0)
            }}
            onKeyDown={handleKeyDown}
            className="pr-8"
          />
          <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: menuWidth }}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="max-h-64 overflow-y-auto py-1">
          {visibleGroups.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{emptyText}</p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.label} className="px-1 py-1">
                <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  optionIndex += 1
                  const currentIndex = optionIndex
                  const isActive = currentIndex === highlight
                  return (
                    <button
                      key={`${group.label}-${item.value}`}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm',
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                      )}
                      onMouseEnter={() => setHighlight(currentIndex)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectValue(item.value)}
                    >
                      <span className="truncate">{item.value}</span>
                      {item.hint ? <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span> : null}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
