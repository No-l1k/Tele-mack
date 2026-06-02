import Link from 'next/link'
import { Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ProductImage } from '@/components/ui/product-image'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryCardProps {
  category: Category
  className?: string
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  const hasImage = Boolean(category.image)

  return (
    <Link href={`/catalog/${category.slug}`}>
      <Card className={cn(
        'group h-full overflow-hidden rounded-md border border-border/60 transition-all duration-200 hover:shadow-md hover:border-primary/40',
        className
      )}>
        {hasImage ? (
          <CardContent className="p-0 h-full bg-card">
            <div className="relative aspect-[4/3] w-full bg-muted">
              <ProductImage
                src={category.image}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 220px"
                className="object-cover"
              />
            </div>
            <div className="px-3 py-2.5 text-center min-h-[84px] flex flex-col items-center justify-center">
              <h3 className="text-sm font-semibold leading-tight line-clamp-2">{category.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {category.productCount} товаров
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-0 h-full bg-card">
            <div className="aspect-[4/3] w-full flex items-center justify-center">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
                <Tag className="h-6 w-6 md:h-7 md:w-7" />
              </div>
            </div>
            <div className="px-3 py-2.5 text-center min-h-[84px] flex flex-col items-center justify-center">
              <h3 className="text-sm font-semibold leading-tight line-clamp-2">{category.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {category.productCount} товаров
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
