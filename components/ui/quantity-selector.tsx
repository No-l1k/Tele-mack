'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  className,
}: QuantitySelectorProps) {
  const decrease = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const increase = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }

  const sizes = {
    sm: {
      button: 'h-7 w-7',
      icon: 'h-3 w-3',
      input: 'w-8 text-sm',
    },
    md: {
      button: 'h-9 w-9',
      icon: 'h-4 w-4',
      input: 'w-10 text-base',
    },
    lg: {
      button: 'h-11 w-11',
      icon: 'h-5 w-5',
      input: 'w-12 text-lg',
    },
  }

  return (
    <div className={cn('flex items-center border rounded-lg', className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(sizes[size].button, 'rounded-r-none')}
        onClick={decrease}
        disabled={value <= min}
      >
        <Minus className={sizes[size].icon} />
        <span className="sr-only">Уменьшить</span>
      </Button>
      <div className={cn('text-center font-medium', sizes[size].input)}>
        {value}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(sizes[size].button, 'rounded-l-none')}
        onClick={increase}
        disabled={value >= max}
      >
        <Plus className={sizes[size].icon} />
        <span className="sr-only">Увеличить</span>
      </Button>
    </div>
  )
}
