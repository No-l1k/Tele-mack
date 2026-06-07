'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const resolved = (images?.length ? images : ['/placeholder.svg']).map((src) => resolveMediaUrl(src))
  const [selectedImage, setSelectedImage] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())
  const hasMultipleImages = resolved.length > 1
  const currentImage = resolved[selectedImage] ?? resolved[0] ?? '/placeholder.svg'
  const currentImageSrc = failedImages.has(currentImage) ? '/placeholder.svg' : currentImage

  useEffect(() => {
    setSelectedImage(0)
    setFailedImages(new Set())
  }, [images.join('|')])

  const markImageFailed = (src: string) => {
    setFailedImages((prev) => {
      if (prev.has(src)) return prev
      const next = new Set(prev)
      next.add(src)
      return next
    })
  }

  const showPrevious = () => {
    setSelectedImage((prev) => (prev - 1 + resolved.length) % resolved.length)
  }

  const showNext = () => {
    setSelectedImage((prev) => (prev + 1) % resolved.length)
  }

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="aspect-square bg-muted/30 rounded-xl overflow-hidden relative">
        <Image
          src={currentImageSrc}
          alt={productName}
          fill
          unoptimized
          className="object-contain p-8"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          onError={() => markImageFailed(currentImage)}
        />

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Предыдущее изображение"
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Следующее изображение"
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto">
          {resolved.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedImage(index)}
              aria-label={`Показать изображение ${index + 1}`}
              className={cn(
                'flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden bg-muted/30 transition-colors',
                selectedImage === index
                  ? 'border-primary'
                  : 'border-transparent hover:border-muted-foreground/30'
              )}
            >
              <Image
                src={failedImages.has(image) ? '/placeholder.svg' : image}
                alt={`${productName} - изображение ${index + 1}`}
                width={80}
                height={80}
                unoptimized
                className="object-contain p-2"
                onError={() => markImageFailed(image)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
