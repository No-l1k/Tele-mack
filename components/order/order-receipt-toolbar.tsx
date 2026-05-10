'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface OrderReceiptToolbarProps {
  backHref: string
  backLabel?: string
}

export function OrderReceiptToolbar({ backHref, backLabel = 'Назад' }: OrderReceiptToolbarProps) {
  return (
    <div className="print:hidden flex flex-wrap gap-2 justify-center py-4 px-4 border-b bg-muted/40">
      <Button variant="outline" asChild>
        <Link href={backHref}>{backLabel}</Link>
      </Button>
      <Button type="button" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" />
        Печать
      </Button>
    </div>
  )
}
