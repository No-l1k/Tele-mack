import { Phone } from 'lucide-react'
import { STORE_PHONES } from '@/lib/store-contacts'
import { cn } from '@/lib/utils'

type StorePhonesProps = {
  variant?: 'inline' | 'stack'
  compact?: boolean
  showIcon?: boolean
  className?: string
  linkClassName?: string
  separator?: string
}

export function StorePhones({
  variant = 'inline',
  compact = false,
  showIcon = false,
  className,
  linkClassName,
  separator = '|',
}: StorePhonesProps) {
  const label = (display: string, displayCompact: string) =>
    compact ? displayCompact : display

  if (variant === 'stack') {
    return (
      <div className={cn('space-y-2', className)}>
        {STORE_PHONES.map((phone) => (
          <a
            key={phone.tel}
            href={`tel:${phone.tel}`}
            className={cn(
              'flex items-center gap-2 hover:text-foreground transition-colors',
              linkClassName
            )}
          >
            {showIcon ? <Phone className="h-4 w-4 flex-shrink-0" /> : null}
            <span>{label(phone.display, phone.displayCompact)}</span>
          </a>
        ))}
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-x-2 gap-y-1',
        className
      )}
    >
      {STORE_PHONES.map((phone, index) => (
        <span key={phone.tel} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span className="text-muted-foreground hidden sm:inline">{separator}</span>
          ) : null}
          <a
            href={`tel:${phone.tel}`}
            className={cn(
              'inline-flex items-center gap-1.5 transition-colors',
              linkClassName
            )}
          >
            {showIcon && index === 0 ? (
              <Phone className="h-3.5 w-3.5" />
            ) : null}
            <span>{label(phone.display, phone.displayCompact)}</span>
          </a>
        </span>
      ))}
    </span>
  )
}
