'use client'

import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { HeroBanner } from '@/lib/api'
import {
  HERO_BANNER_ACCEPT,
  HERO_BANNER_ALT_MAX,
  HERO_BANNER_GUIDELINE,
  heroHrefError,
  partitionHeroBannerFiles,
} from '@/lib/hero-banners'
import { resolveMediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Slot = 'desktop' | 'mobile'

function BannerCropPreview({
  src,
  label,
  aspectClass,
  emptyText,
  disabled,
  onDropFile,
}: {
  src: string
  label: string
  aspectClass: string
  emptyText?: string
  disabled: boolean
  onDropFile: (file: File) => void
}) {
  const [isFileOver, setIsFileOver] = useState(false)

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    setIsFileOver(true)
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className={cn(
          `relative w-full overflow-hidden rounded-md bg-muted/30 ${aspectClass}`,
          isFileOver && 'ring-2 ring-primary'
        )}
        onDragOver={onDragOver}
        onDragLeave={() => setIsFileOver(false)}
        onDrop={(event) => {
          if (!event.dataTransfer.files?.length) return
          event.preventDefault()
          event.stopPropagation()
          setIsFileOver(false)
          if (disabled) return
          const file = event.dataTransfer.files[0]
          if (file) onDropFile(file)
        }}
      >
        {src ? (
          <Image src={src} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  )
}

function FilePickButton({
  label,
  disabled,
  onFile,
}: {
  label: string
  disabled: boolean
  onFile: (file: File) => void
}) {
  return (
    <label
      className={cn(
        'inline-flex h-8 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {label}
      <input
        type="file"
        accept={HERO_BANNER_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
    </label>
  )
}

interface HeroBannersEditorProps {
  banners: HeroBanner[]
  dirty: boolean
  busy: boolean
  deletingKey: string | null
  hasInvalidHref: boolean
  saving: boolean
  onUpload: (files: File[]) => void
  onReplace: (banner: HeroBanner, slot: Slot, file: File) => void
  onDeleteBanner: (banner: HeroBanner) => void
  onDeleteMobile: (banner: HeroBanner) => void
  onMove: (from: number, to: number) => void
  onPatch: (index: number, patch: Partial<HeroBanner>) => void
  onSave: () => void
}

export function HeroBannersEditor({
  banners,
  dirty,
  busy,
  deletingKey,
  hasInvalidHref,
  saving,
  onUpload,
  onReplace,
  onDeleteBanner,
  onDeleteMobile,
  onMove,
  onPatch,
  onSave,
}: HeroBannersEditorProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [fileDropActive, setFileDropActive] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const pointerYRef = useRef<number | null>(null)
  const dragFromRef = useRef<number | null>(null)
  const dragOverRef = useRef<number | null>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  const indexFromClientY = (clientY: number) => {
    const nodes = listRef.current?.querySelectorAll<HTMLElement>('[data-banner-index]')
    if (!nodes?.length) return 0
    for (let i = 0; i < nodes.length; i += 1) {
      const rect = nodes[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return nodes.length - 1
  }

  const stopReorder = () => {
    const from = dragFromRef.current
    const to = dragOverRef.current
    dragFromRef.current = null
    dragOverRef.current = null
    pointerYRef.current = null
    setDragFrom(null)
    setDragOver(null)
    if (from !== null && to !== null && from !== to) onMoveRef.current(from, to)
  }

  useEffect(() => {
    if (dragFrom === null) return

    const updateHover = () => {
      const y = pointerYRef.current
      if (y == null) return
      const next = indexFromClientY(y)
      dragOverRef.current = next
      setDragOver((prev) => (prev === next ? prev : next))
    }

    const tick = () => {
      const y = pointerYRef.current
      if (y != null) {
        const headerOffset = 72
        const edge = 88
        const topLimit = headerOffset + edge
        const bottomLimit = window.innerHeight - edge
        if (y < topLimit) {
          window.scrollBy(0, -Math.max(10, Math.round((topLimit - y) * 0.4)))
        } else if (y > bottomLimit) {
          window.scrollBy(0, Math.max(10, Math.round((y - bottomLimit) * 0.4)))
        }
        updateHover()
      }
      frame = requestAnimationFrame(tick)
    }
    let frame = requestAnimationFrame(tick)

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      window.scrollBy(0, event.deltaY)
      updateHover()
    }
    const onPointerMove = (event: PointerEvent) => {
      pointerYRef.current = event.clientY
      updateHover()
    }
    const onPointerUp = () => stopReorder()

    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [dragFrom])

  const startReorder = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    if (event.button !== 0 || busy) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragFromRef.current = index
    dragOverRef.current = index
    pointerYRef.current = event.clientY
    setDragFrom(index)
    setDragOver(index)
  }

  const moveReorder = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragFromRef.current === null) return
    pointerYRef.current = event.clientY
    const next = indexFromClientY(event.clientY)
    dragOverRef.current = next
    setDragOver((prev) => (prev === next ? prev : next))
  }

  const acceptFiles = (files: File[] | FileList, handler: (accepted: File[]) => void) => {
    const { accepted, rejectedMessages } = partitionHeroBannerFiles(Array.from(files))
    if (rejectedMessages.length) {
      toast.warning('Некоторые файлы пропущены', { description: rejectedMessages.join('; ') })
    }
    if (accepted.length) handler(accepted)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/30 p-3">
        {HERO_BANNER_GUIDELINE}
      </p>

      <div
        className={cn(
          'space-y-2 rounded-md border border-dashed p-3',
          fileDropActive && 'border-primary bg-primary/5'
        )}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setFileDropActive(true)
        }}
        onDragLeave={() => setFileDropActive(false)}
        onDrop={(event) => {
          if (!event.dataTransfer.files?.length) return
          event.preventDefault()
          setFileDropActive(false)
          if (busy || hasInvalidHref) return
          acceptFiles(event.dataTransfer.files, onUpload)
        }}
      >
        <Label htmlFor="hero-banners-upload">Загрузка фото</Label>
        <Input
          id="hero-banners-upload"
          type="file"
          accept={HERO_BANNER_ACCEPT}
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            if (!files.length) return
            acceptFiles(files, onUpload)
          }}
          disabled={busy || hasInvalidHref}
        />
        <p className="text-xs text-muted-foreground">Можно перетащить файлы в эту область — так добавляются новые слайды.</p>
        {hasInvalidHref ? (
          <p className="text-xs text-red-600">Исправьте некорректные ссылки, прежде чем загружать или удалять баннеры.</p>
        ) : null}
      </div>

      {banners.length > 0 ? (
        <div ref={listRef} className={cn('space-y-3', dragFrom !== null && 'select-none')}>
          {banners.map((banner, index) => {
            const hrefError = heroHrefError(banner.href || '')
            const desktopSrc = resolveMediaUrl(banner.image)
            const mobileSrc = banner.mobileImage ? resolveMediaUrl(banner.mobileImage) : ''
            const cardBusy = busy || deletingKey === banner.id || deletingKey === `${banner.id}:mobile`
            return (
              <div
                key={banner.id || `${banner.image}-${index}`}
                data-banner-index={index}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border p-3',
                  banner.enabled === false && 'opacity-70',
                  dragFrom === index && 'opacity-50',
                  dragFrom !== null && dragOver === index && dragFrom !== index && 'ring-2 ring-primary'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                      disabled={cardBusy}
                      aria-label="Перетащить слайд"
                      aria-grabbed={dragFrom === index}
                      onPointerDown={(event) => startReorder(event, index)}
                      onPointerMove={moveReorder}
                      onPointerUp={stopReorder}
                      onPointerCancel={stopReorder}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-medium">
                      Слайд {index + 1}
                      {index === 0 ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">первый в карусели</span>
                      ) : null}
                      {banner.enabled === false ? (
                        <span className="ml-2 text-xs font-normal text-amber-700">скрыт на сайте</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`banner-enabled-${banner.id}`} className="text-sm font-normal">
                      Показывать на сайте
                    </Label>
                    <Switch
                      id={`banner-enabled-${banner.id}`}
                      checked={banner.enabled !== false}
                      disabled={cardBusy}
                      onCheckedChange={(checked) => onPatch(index, { enabled: checked })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <BannerCropPreview
                      src={desktopSrc}
                      label="Основное фото, компьютер 3:1"
                      aspectClass="aspect-[3/1]"
                      disabled={cardBusy || hasInvalidHref}
                      onDropFile={(file) => acceptFiles([file], (accepted) => onReplace(banner, 'desktop', accepted[0]))}
                    />
                    <FilePickButton
                      label="Заменить основное"
                      disabled={cardBusy || hasInvalidHref}
                      onFile={(file) => acceptFiles([file], (accepted) => onReplace(banner, 'desktop', accepted[0]))}
                    />
                  </div>
                  <div className="space-y-2">
                    <BannerCropPreview
                      src={mobileSrc}
                      label="Мобильное фото 16:10"
                      aspectClass="aspect-[16/10]"
                      emptyText="Нет отдельного кадра — на телефоне обрежется основное фото. Перетащите файл сюда."
                      disabled={cardBusy || hasInvalidHref}
                      onDropFile={(file) => acceptFiles([file], (accepted) => onReplace(banner, 'mobile', accepted[0]))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <FilePickButton
                        label={banner.mobileImage ? 'Заменить мобильное' : 'Добавить мобильное'}
                        disabled={cardBusy || hasInvalidHref}
                        onFile={(file) => acceptFiles([file], (accepted) => onReplace(banner, 'mobile', accepted[0]))}
                      />
                      {banner.mobileImage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-red-600 hover:text-red-700"
                          disabled={cardBusy || hasInvalidHref}
                          onClick={() => onDeleteMobile(banner)}
                        >
                          Убрать мобильное
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`banner-alt-${banner.id}`}>Alt-текст</Label>
                  <Input
                    id={`banner-alt-${banner.id}`}
                    maxLength={HERO_BANNER_ALT_MAX}
                    placeholder="Кратко, что на баннере, например: Скидки на телевизоры Samsung"
                    value={banner.alt || ''}
                    onChange={(event) => onPatch(index, { alt: event.target.value.slice(0, HERO_BANNER_ALT_MAX) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`banner-href-${banner.id}`}>Ссылка при клике</Label>
                  <Input
                    id={`banner-href-${banner.id}`}
                    placeholder="/catalog/televizory или https://example.com"
                    value={banner.href || ''}
                    onChange={(event) => onPatch(index, { href: event.target.value })}
                    aria-invalid={Boolean(hrefError)}
                  />
                  {hrefError ? <p className="text-xs text-red-600">{hrefError}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onMove(index, index - 1)}
                    disabled={index === 0 || cardBusy}
                  >
                    <ChevronUp className="mr-1 h-4 w-4" />
                    Вверх
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onMove(index, index + 1)}
                    disabled={index === banners.length - 1 || cardBusy}
                  >
                    <ChevronDown className="mr-1 h-4 w-4" />
                    Вниз
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDeleteBanner(banner)}
                    disabled={deletingKey === banner.id || cardBusy || hasInvalidHref}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Удалить слайд
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Баннеры не загружены. На главной будет пустая заглушка, пока вы не добавите изображения.
        </p>
      )}

      {dirty ? (
        <p className="text-sm text-amber-700">
          Есть несохранённые изменения баннеров. Нажмите «Сохранить настройки баннеров».
        </p>
      ) : null}

      <Button onClick={onSave} disabled={busy || hasInvalidHref || !dirty}>
        {saving ? 'Сохранение...' : 'Сохранить настройки баннеров'}
      </Button>
    </div>
  )
}
