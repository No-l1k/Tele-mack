'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { formatPriceShort } from '@/lib/formatters'
import type { SpecFacets } from '@/types'

interface ProductFiltersProps {
  brands: string[]
  selectedBrands: string[]
  onBrandsChange: (brands: string[]) => void
  priceRange: { min: number; max: number }
  selectedPriceRange: [number, number]
  onPriceRangeChange: (range: [number, number]) => void
  inStockOnly: boolean
  onInStockChange: (inStock: boolean) => void
  specFacets?: SpecFacets
  selectedSpecFilters?: Record<string, string[]>
  onSpecFiltersChange?: (filters: Record<string, string[]>) => void
  onReset: () => void
}

function countSpecSelections(selectedSpecFilters: Record<string, string[]>) {
  return Object.values(selectedSpecFilters).reduce((sum, values) => sum + values.length, 0)
}

export function ProductFilters({
  brands,
  selectedBrands,
  onBrandsChange,
  priceRange,
  selectedPriceRange,
  onPriceRangeChange,
  inStockOnly,
  onInStockChange,
  specFacets = {},
  selectedSpecFilters = {},
  onSpecFiltersChange,
  onReset,
}: ProductFiltersProps) {
  const sliderBounds = useMemo(() => {
    const min = priceRange.min
    let max = priceRange.max
    if (max <= min) {
      max = min + 1000
    }
    return { min, max }
  }, [priceRange.min, priceRange.max])

  const specFacetEntries = useMemo(
    () => Object.entries(specFacets).filter(([, values]) => values.length > 0),
    [specFacets],
  )

  const [draftPriceRange, setDraftPriceRange] = useState<[number, number]>(selectedPriceRange)

  useEffect(() => {
    setDraftPriceRange(selectedPriceRange)
  }, [selectedPriceRange])

  const hasFilters =
    selectedBrands.length > 0 ||
    inStockOnly ||
    selectedPriceRange[0] !== sliderBounds.min ||
    selectedPriceRange[1] !== sliderBounds.max ||
    countSpecSelections(selectedSpecFilters) > 0

  const toggleSpecValue = (specKey: string, value: string, checked: boolean) => {
    if (!onSpecFiltersChange) return
    const current = selectedSpecFilters[specKey] ?? []
    const nextValues = checked ? [...current, value] : current.filter((item) => item !== value)
    const nextFilters = { ...selectedSpecFilters }
    if (nextValues.length > 0) {
      nextFilters[specKey] = nextValues
    } else {
      delete nextFilters[specKey]
    }
    onSpecFiltersChange(nextFilters)
  }

  const filterContent = (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4">Цена, руб</h3>
        <div className="px-2">
          <Slider
            value={draftPriceRange}
            min={sliderBounds.min}
            max={sliderBounds.max}
            step={1000}
            onValueChange={(value) => setDraftPriceRange(value as [number, number])}
            onValueCommit={(value) => onPriceRangeChange(value as [number, number])}
            className="mb-4"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatPriceShort(draftPriceRange[0])}</span>
            <span>{formatPriceShort(draftPriceRange[1])}</span>
          </div>
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="font-medium mb-4">Бренд</h3>
          <div className="space-y-3">
            {brands.map((brand) => (
              <div key={brand} className="flex items-center gap-2">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={selectedBrands.includes(brand)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onBrandsChange([...selectedBrands, brand])
                    } else {
                      onBrandsChange(selectedBrands.filter((b) => b !== brand))
                    }
                  }}
                />
                <Label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer">
                  {brand}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {specFacetEntries.map(([specKey, values]) => {
        const selectedForKey = selectedSpecFilters[specKey] ?? []
        const displayValues = [...values]
        for (const selected of selectedForKey) {
          if (!displayValues.includes(selected)) {
            displayValues.push(selected)
          }
        }
        return (
        <div key={specKey}>
          <h3 className="font-medium mb-4">{specKey}</h3>
          <div className="space-y-3">
            {displayValues.map((value) => {
              const inputId = `spec-${specKey}-${value}`.replace(/[^a-zA-Z0-9_-]/g, '_')
              return (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={inputId}
                    checked={selectedForKey.includes(value)}
                    onCheckedChange={(checked) => toggleSpecValue(specKey, value, checked === true)}
                  />
                  <Label htmlFor={inputId} className="text-sm cursor-pointer">
                    {value}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>
        )
      })}

      <div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="in-stock"
            checked={inStockOnly}
            onCheckedChange={(checked) => onInStockChange(checked as boolean)}
          />
          <Label htmlFor="in-stock" className="text-sm cursor-pointer">
            Только в наличии
          </Label>
        </div>
      </div>

      {hasFilters && (
        <Button variant="outline" className="w-full" onClick={onReset}>
          <X className="h-4 w-4 mr-2" />
          Сбросить фильтры
        </Button>
      )}
    </div>
  )

  return (
    <>
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 bg-background border rounded-lg p-6">
          <h2 className="font-semibold mb-6">Фильтры</h2>
          {filterContent}
        </div>
      </div>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Фильтры
              {hasFilters && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
