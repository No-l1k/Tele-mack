'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Bold, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  createImageBlock,
  createSectionBlock,
  parseDescriptionBlocks,
  serializeDescriptionBlocks,
  type DescriptionBlock,
} from '@/lib/description-blocks'

export type DescriptionBlocksEditorHandle = {
  /** Файлы для блоков без URL — загрузка на сервер после POST /products (создание товара). */
  getPendingImageFilesByBlockId: () => Record<string, File>
}

type DescriptionBlocksEditorProps = {
  value: string
  onChange: (value: string) => void
  onUploadImageFile?: (file: File) => Promise<string>
  onDeleteImageFile?: (url: string) => Promise<void>
}

export const DescriptionBlocksEditor = forwardRef<
  DescriptionBlocksEditorHandle,
  DescriptionBlocksEditorProps
>(function DescriptionBlocksEditor({ value, onChange, onUploadImageFile, onDeleteImageFile }, ref) {
  const initialItems = parseDescriptionBlocks(value)
  const [items, setItems] = useState<DescriptionBlock[]>(initialItems)
  const serializedRef = useRef(serializeDescriptionBlocks(initialItems))
  const [busyImageId, setBusyImageId] = useState<string | null>(null)
  const sectionTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  /** Только для страницы «новый товар»: файл до появления product id */
  const [pendingFilesByBlockId, setPendingFilesByBlockId] = useState<Record<string, File>>({})
  const [previewUrlByBlockId, setPreviewUrlByBlockId] = useState<Record<string, string>>({})
  const previewUrlByBlockIdRef = useRef<Record<string, string>>({})
  previewUrlByBlockIdRef.current = previewUrlByBlockId

  const revokePreview = (blockId: string) => {
    setPreviewUrlByBlockId((prev) => {
      const url = prev[blockId]
      if (url) URL.revokeObjectURL(url)
      const next = { ...prev }
      delete next[blockId]
      return next
    })
  }

  useEffect(() => {
    return () => {
      Object.values(previewUrlByBlockIdRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      getPendingImageFilesByBlockId: () => ({ ...pendingFilesByBlockId }),
    }),
    [pendingFilesByBlockId],
  )

  useEffect(() => {
    if (value === serializedRef.current) return
    const parsed = parseDescriptionBlocks(value)
    setItems(parsed)
    serializedRef.current = serializeDescriptionBlocks(parsed)
  }, [value])

  useEffect(() => {
    const serialized = serializeDescriptionBlocks(items)
    serializedRef.current = serialized
    onChange(serialized)
  }, [items, onChange])

  const insertAfter = (index: number, block: DescriptionBlock) => {
    setItems((prev) => [...prev.slice(0, index + 1), block, ...prev.slice(index + 1)])
  }

  const updateBlock = (id: string, patch: Partial<DescriptionBlock>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? ({ ...item, ...patch } as DescriptionBlock) : item)))
  }

  const clearPendingForBlock = (blockId: string) => {
    setPendingFilesByBlockId((prev) => {
      if (!(blockId in prev)) return prev
      const next = { ...prev }
      delete next[blockId]
      return next
    })
    revokePreview(blockId)
  }

  const queueLocalFile = (blockId: string, file: File) => {
    setPreviewUrlByBlockId((prev) => {
      const old = prev[blockId]
      if (old) URL.revokeObjectURL(old)
      return { ...prev, [blockId]: URL.createObjectURL(file) }
    })
    setPendingFilesByBlockId((prev) => ({ ...prev, [blockId]: file }))
    updateBlock(blockId, { src: '' })
  }

  const removeBlock = async (id: string) => {
    const current = items.find((item) => item.id === id)
    if (current?.type === 'image' && current.src.trim() && onDeleteImageFile) {
      setBusyImageId(id)
      try {
        const sameUrlCount = items.filter((item) => item.type === 'image' && item.src === current.src).length
        if (sameUrlCount <= 1) {
          await onDeleteImageFile(current.src)
        }
      } catch {
        // Не блокируем удаление блока, даже если удаление файла на сервере не удалось.
      } finally {
        setBusyImageId(null)
      }
    }
    clearPendingForBlock(id)
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id)
      return next.length > 0 ? next : [createSectionBlock()]
    })
  }

  const uploadImageToBlock = async (blockId: string, file: File) => {
    if (!onUploadImageFile) return
    const current = items.find((item) => item.id === blockId)
    if (!current || current.type !== 'image') return
    setBusyImageId(blockId)
    try {
      const newUrl = await onUploadImageFile(file)
      const oldUrl = current.src.trim()
      clearPendingForBlock(blockId)
      updateBlock(blockId, { src: newUrl })

      if (oldUrl && onDeleteImageFile) {
        const sameUrlCount = items.filter((item) => item.type === 'image' && item.src === oldUrl).length
        if (sameUrlCount <= 1) {
          await onDeleteImageFile(oldUrl)
        }
      }
    } finally {
      setBusyImageId(null)
    }
  }

  const applyBoldToSection = (blockId: string) => {
    const element = sectionTextareaRefs.current[blockId]
    const section = items.find(
      (item): item is Extract<DescriptionBlock, { type: 'section' }> =>
        item.id === blockId && item.type === 'section',
    )
    if (!element || !section) return

    const start = element.selectionStart
    const end = element.selectionEnd
    if (start === end) return

    const currentText = section.text
    const selectedText = currentText.slice(start, end)
    const hasLocalMarkers = selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4
    const hasOuterMarkers = start >= 2 && currentText.slice(start - 2, start) === '**' && currentText.slice(end, end + 2) === '**'

    if (hasLocalMarkers) {
      const unwrapped = selectedText.slice(2, -2)
      const nextText = `${currentText.slice(0, start)}${unwrapped}${currentText.slice(end)}`
      updateBlock(blockId, { text: nextText })
      setTimeout(() => {
        const target = sectionTextareaRefs.current[blockId]
        if (!target) return
        target.focus()
        target.setSelectionRange(start, start + unwrapped.length)
      }, 0)
      return
    }

    if (hasOuterMarkers) {
      const nextText = `${currentText.slice(0, start - 2)}${selectedText}${currentText.slice(end + 2)}`
      updateBlock(blockId, { text: nextText })
      setTimeout(() => {
        const target = sectionTextareaRefs.current[blockId]
        if (!target) return
        target.focus()
        target.setSelectionRange(start - 2, end - 2)
      }, 0)
      return
    }

    const nextText = `${currentText.slice(0, start)}**${selectedText}**${currentText.slice(end)}`
    updateBlock(blockId, { text: nextText })
    setTimeout(() => {
      const target = sectionTextareaRefs.current[blockId]
      if (!target) return
      target.focus()
      target.setSelectionRange(start + 2, end + 2)
    }, 0)
  }

  const handleImageFileChosen = (blockId: string, file: File) => {
    if (onUploadImageFile) {
      void uploadImageToBlock(blockId, file)
    } else {
      queueLocalFile(blockId, file)
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Блоки описания</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, createSectionBlock()])}>
            <Plus className="mr-1 h-4 w-4" />
            Блок
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, createImageBlock()])}>
            <ImagePlus className="mr-1 h-4 w-4" />
            Картинка
          </Button>
        </div>
      </div>

      {items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {item.type === 'section' ? 'Блок текста' : 'Блок картинки'}
            </p>
            <Button type="button" variant="ghost" size="icon" disabled={busyImageId === item.id} onClick={() => void removeBlock(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {item.type === 'section' ? (
            <div className="space-y-2">
              <Input
                value={item.title}
                onChange={(event) => updateBlock(item.id, { title: event.target.value })}
                placeholder="Заголовок"
              />
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                <Button type="button" variant="ghost" size="icon" onClick={() => applyBoldToSection(item.id)}>
                  <Bold className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground">Выделите фрагмент и нажмите B (или Ctrl+B).</p>
              </div>
              <Textarea
                ref={(node) => {
                  sectionTextareaRefs.current[item.id] = node
                }}
                value={item.text}
                onChange={(event) => updateBlock(item.id, { text: event.target.value })}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
                    event.preventDefault()
                    applyBoldToSection(item.id)
                  }
                }}
                placeholder="Текст блока"
                rows={6}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`desc-img-file-${item.id}`} className="text-xs text-muted-foreground">
                  Файл с компьютера
                </Label>
                <Input
                  id={`desc-img-file-${item.id}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busyImageId === item.id}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    handleImageFileChosen(item.id, file)
                    event.currentTarget.value = ''
                  }}
                />
                {!onUploadImageFile && (
                  <p className="text-xs text-muted-foreground">
                    Файл отправится на сервер сразу после сохранения товара (как фото в галерее).
                  </p>
                )}
              </div>

              {(item.src.trim() || previewUrlByBlockId[item.id]) && (
                <div className="flex justify-center rounded-md border bg-background p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- превью blob/data URL в админке */}
                  <img
                    src={item.src.trim() || previewUrlByBlockId[item.id]}
                    alt={item.alt || ''}
                    className="max-h-48 w-auto max-w-full rounded object-contain"
                  />
                </div>
              )}

              <details className="rounded-md border bg-muted/20 px-3 py-2">
                <summary className="cursor-pointer select-none text-xs text-muted-foreground">Указать URL вручную</summary>
                <Input
                  className="mt-2 font-mono text-sm"
                  value={item.src}
                  onChange={(event) => {
                    const next = event.target.value
                    updateBlock(item.id, { src: next })
                    if (next.trim()) {
                      clearPendingForBlock(item.id)
                    }
                  }}
                  placeholder="/uploads/products/..."
                  disabled={busyImageId === item.id}
                />
              </details>

              <div className="space-y-1">
                <Label htmlFor={`desc-img-alt-${item.id}`} className="text-xs text-muted-foreground">
                  Подпись (alt) для картинки
                </Label>
                <Input
                  id={`desc-img-alt-${item.id}`}
                  value={item.alt}
                  onChange={(event) => updateBlock(item.id, { alt: event.target.value })}
                  placeholder="Необязательно"
                  disabled={busyImageId === item.id}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => insertAfter(index, createSectionBlock())}>
              + Блок ниже
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => insertAfter(index, createImageBlock())}>
              + Картинка ниже
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
})
