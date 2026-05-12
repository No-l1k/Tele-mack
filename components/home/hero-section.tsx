'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media'
import { publicSettingsApi, type HeroBanner } from '@/lib/api'

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<HeroBanner[]>([])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const response = await publicSettingsApi.get()
        const banners = Array.isArray(response.data.heroBanners)
          ? response.data.heroBanners
              .filter((item): item is HeroBanner => Boolean(item && typeof item.image === 'string' && item.image.trim()))
              .map((item) => ({ image: resolveMediaUrl(item.image), href: item.href || '' }))
          : []
        if (!cancelled) {
          setSlides(banners.length ? banners : [])
        }
      } catch {
        if (!cancelled) {
          setSlides([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const goToPrev = () => {
    if (slides.length <= 1) return
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    if (slides.length <= 1) return
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="relative mx-auto w-full max-w-full lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1200px] rounded-xl md:rounded-2xl overflow-hidden bg-foreground/5 aspect-[16/10] sm:aspect-[21/9] md:aspect-[3/1]">
          {slides.length === 0 ? (
            <div
              className="absolute inset-0 bg-muted"
              role="img"
              aria-label="Баннер не настроен"
            />
          ) : (
            <>
              {slides.map((slide, index) => (
                <div
                  key={`${slide.image}-${index}`}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-700',
                    index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  )}
                >
                  {slide.href ? (
                    <Link href={slide.href} className="relative block h-full w-full cursor-pointer" aria-label={`Перейти по баннеру ${index + 1}`}>
                      <Image
                        src={slide.image}
                        alt={`Баннер ${index + 1}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, min(1200px, 85vw)"
                        className="object-cover"
                        priority={index === 0}
                        unoptimized
                      />
                    </Link>
                  ) : (
                    <div className="relative h-full w-full">
                      <Image
                        src={slide.image}
                        alt={`Баннер ${index + 1}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, min(1200px, 85vw)"
                        className="object-cover"
                        priority={index === 0}
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              ))}

              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPrev}
                    className="hidden sm:flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm items-center justify-center text-white transition-colors"
                    aria-label="Предыдущий слайд"
                  >
                    <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="hidden sm:flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm items-center justify-center text-white transition-colors"
                    aria-label="Следующий слайд"
                  >
                    <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                  </button>

                  <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-2">
                    {slides.map((_, index) => (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={cn(
                          'h-1.5 md:h-2 rounded-full transition-all',
                          index === currentSlide
                            ? 'w-4 md:w-6 bg-white'
                            : 'w-1.5 md:w-2 bg-white/50 hover:bg-white/70'
                        )}
                        aria-label={`Слайд ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
