import Link from 'next/link'
import { Tv, Settings, Speaker, Camera, Aperture, Wind, Package, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

const categoryIcons: Record<string, React.ReactNode> = {
  'novinki': <Sparkles className="h-6 w-6 md:h-7 md:w-7" />,
  'televizory': <Tv className="h-6 w-6 md:h-7 md:w-7" />,
  'aksessuary-dlya-televizorov': <Package className="h-6 w-6 md:h-7 md:w-7" />,
  'kronshteyny': <Settings className="h-6 w-6 md:h-7 md:w-7" />,
  'saundbary': <Speaker className="h-6 w-6 md:h-7 md:w-7" />,
  'fotoapparaty': <Camera className="h-6 w-6 md:h-7 md:w-7" />,
  'fotoobektivy': <Aperture className="h-6 w-6 md:h-7 md:w-7" />,
  'dyson': <Wind className="h-6 w-6 md:h-7 md:w-7" />,
}

interface CategoryCardProps {
  category: Category
  className?: string
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  return (
    <Link href={`/catalog/${category.slug}`}>
      <Card className={cn(
        'group h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/50 border-border/50',
        className
      )}>
        <CardContent className="p-3 md:p-4 flex flex-col items-center text-center h-full justify-center min-h-[120px] md:min-h-[140px]">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-muted/80 flex items-center justify-center mb-2 md:mb-3 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
            {categoryIcons[category.slug] || <Package className="h-6 w-6 md:h-7 md:w-7" />}
          </div>
          <h3 className="text-xs md:text-sm font-medium leading-tight line-clamp-2">{category.name}</h3>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
            {category.productCount} товаров
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
