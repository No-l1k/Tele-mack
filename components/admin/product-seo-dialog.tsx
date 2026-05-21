'use client'

import { useEffect, useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { settingsApi } from '@/lib/api'
import { storePhonesContactLine } from '@/lib/store-contacts'
import { siteConfig } from '@/lib/site'
import {
  META_DESCRIPTION_MAX,
  META_TITLE_MAX,
  buildProductSeoPreview,
  generateProductSeoDescription,
  generateProductSeoTitle,
  type ProductSeoInput,
} from '@/lib/product-seo'

export type ProductSeoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seoInput: ProductSeoInput
  metaTitle: string
  metaDescription: string
  onApply: (metaTitle: string, metaDescription: string) => void
}

export function ProductSeoDialog({
  open,
  onOpenChange,
  seoInput,
  metaTitle,
  metaDescription,
  onApply,
}: ProductSeoDialogProps) {
  const [title, setTitle] = useState(metaTitle)
  const [description, setDescription] = useState(metaDescription)
  const [storeName, setStoreName] = useState(siteConfig.name)
  const [storePhone, setStorePhone] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(metaTitle)
    setDescription(metaDescription)
    settingsApi
      .get()
      .then((res) => {
        if (res.data?.name) setStoreName(res.data.name)
        setStorePhone(storePhonesContactLine(res.data?.phone))
      })
      .catch(() => {})
  }, [open, metaTitle, metaDescription])

  const enrichedInput = useMemo(
    () => ({ ...seoInput, storeName, storePhone }),
    [seoInput, storeName, storePhone]
  )

  const preview = useMemo(
    () => buildProductSeoPreview(enrichedInput, title, description, storeName, storePhone),
    [enrichedInput, title, description, storeName, storePhone]
  )

  const autoTitle = useMemo(
    () => generateProductSeoTitle(enrichedInput, storeName),
    [enrichedInput, storeName]
  )
  const autoDescription = useMemo(
    () => generateProductSeoDescription(enrichedInput, storeName, storePhone),
    [enrichedInput, storeName, storePhone]
  )

  const handleReset = () => {
    setTitle('')
    setDescription('')
  }

  const handleApply = () => {
    onApply(title.trim(), description.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Поисковые сервисы (SEO)</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">
          SEO влияет на позицию товара в поисковых системах (Яндекс, Google и др.). Заголовок и описание
          формируются автоматически по названию, цене и разделу — при необходимости их можно изменить вручную.
        </p>

        <section className="rounded-lg border bg-muted/20 p-4 space-y-2" aria-label="Предпросмотр в поиске">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Как увидят в поиске</p>
          <p className="text-[#1a0dab] text-lg leading-snug break-words">{preview.title || '—'}</p>
          <p className="text-[#006621] text-sm break-all">{preview.url}</p>
          <p className="text-sm text-[#545454] leading-relaxed break-words">{preview.description || '—'}</p>
          <p className="text-xs text-muted-foreground">
            {!preview.isTitleCustom && !preview.isDescriptionCustom
              ? 'Сейчас показаны автоматические значения'
              : [
                  preview.isTitleCustom ? 'заголовок изменён вручную' : null,
                  preview.isDescriptionCustom ? 'описание изменено вручную' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </section>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="seo-title" className="flex items-center gap-1.5">
                Title
                <span className="text-muted-foreground font-normal" title="Заголовок страницы в поиске">
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {title.length}/{META_TITLE_MAX}
              </span>
            </div>
            <Input
              id="seo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={META_TITLE_MAX}
              placeholder={autoTitle}
            />
            {!title.trim() && autoTitle ? (
              <p className="text-xs text-muted-foreground">Авто: {autoTitle}</p>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setHelpOpen((v) => !v)}
            >
              Как заполнить
            </button>
            {helpOpen ? (
              <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>В Title — название товара и ключевые слова, в конце название магазина.</li>
                <li>В Description — цена, доставка, телефон и раздел (бренд или категория).</li>
                <li>Оставьте поля пустыми, чтобы использовать автоматическую генерацию при каждом сохранении.</li>
              </ul>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="seo-description" className="flex items-center gap-1.5">
                Description
                <span className="text-muted-foreground font-normal" title="Описание в результатах поиска">
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {description.length}/{META_DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="seo-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={META_DESCRIPTION_MAX}
              rows={5}
              placeholder={autoDescription}
            />
            {!description.trim() && autoDescription ? (
              <p className="text-xs text-muted-foreground line-clamp-3">Авто: {autoDescription}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleReset}>
            Сбросить к авто
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button type="button" onClick={handleApply}>
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
