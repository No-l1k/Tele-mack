import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

export function Rating({ value, max = 5, size = 'md', showValue = false, className }: RatingProps) {
  const sizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              sizes[size],
              i < Math.floor(value)
                ? 'text-yellow-400 fill-yellow-400'
                : i < value
                  ? 'text-yellow-400 fill-yellow-400/50'
                  : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  )
}
