'use client'

import Link from 'next/link'
import { Tv, Settings, Speaker, Camera, Aperture, Wind, Package, Sparkles } from 'lucide-react'
import type { Category } from '@/types'

const categoryIcons: Record<string, React.ReactNode> = {
  'novinki': <Sparkles className="h-5 w-5" />,
  'televizory': <Tv className="h-5 w-5" />,
  'aksessuary-dlya-televizorov': <Package className="h-5 w-5" />,
  'kronshteyny': <Settings className="h-5 w-5" />,
  'saundbary': <Speaker className="h-5 w-5" />,
  'fotoapparaty': <Camera className="h-5 w-5" />,
  'fotoobektivy': <Aperture className="h-5 w-5" />,
  'dyson': <Wind className="h-5 w-5" />,
}

interface MegaMenuProps {
  onClose: () => void
  categories: Category[]
  brands: string[]
}

export function MegaMenu({ onClose, categories, brands }: MegaMenuProps) {
  return (
    <div 
      className="absolute top-full left-0 mt-2 w-[560px] max-w-[90vw] bg-background border rounded-xl shadow-lg overflow-hidden z-50"
      onMouseLeave={onClose}
    >
      <div className="grid grid-cols-2 gap-0">
        <div className="p-2 max-h-[70vh] overflow-y-auto border-r">
        {categories.map(category => (
          <div key={category.id} className="mb-1">
            <Link
              href={`/catalog/${category.slug}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
              onClick={onClose}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {categoryIcons[category.slug] || <Package className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{category.name}</div>
                <div className="text-xs text-muted-foreground">
                  {category.productCount} товаров
                </div>
              </div>
            </Link>
            {(category.children ?? []).map((child) => (
              <Link
                key={child.id}
                href={`/catalog/${child.slug}`}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg hover:bg-muted/70 transition-colors text-sm text-muted-foreground"
                onClick={onClose}
              >
                <span className="text-xs">-</span>
                <span>{child.name}</span>
              </Link>
            ))}
          </div>
        ))}
        </div>
        <div className="p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Бренды</div>
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/catalog/brand/${encodeURIComponent(brand)}`}
                className="px-2.5 py-1 rounded-full bg-muted text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={onClose}
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="p-3 bg-muted/50 border-t">
        <Link
          href="/catalog"
          className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary hover:underline"
          onClick={onClose}
        >
          Все категории
        </Link>
      </div>
    </div>
  )
}
