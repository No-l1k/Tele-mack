'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { formatRuPhoneMask } from '@/lib/phone'
import { cn } from '@/lib/utils'

export interface PhoneInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
}

export function PhoneInput({
  value,
  onValueChange,
  className,
  placeholder = '+7 (999) 999-99-99',
  ...props
}: PhoneInputProps) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      className={cn(className)}
      value={value}
      onChange={(e) => onValueChange(formatRuPhoneMask(e.target.value))}
    />
  )
}
