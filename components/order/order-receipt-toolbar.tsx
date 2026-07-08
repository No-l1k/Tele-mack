'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Pencil, Printer } from 'lucide-react'

interface OrderReceiptToolbarProps {
  backHref: string
  backLabel?: string
  editHref?: string
}

export function OrderReceiptToolbar({ backHref, backLabel = 'Назад', editHref }: OrderReceiptToolbarProps) {
  return (
    <div className="print:hidden flex flex-wrap gap-2 justify-center py-4 px-4 border-b bg-muted/40">
      <Button variant="outline" asChild>
        <Link href={backHref}>{backLabel}</Link>
      </Button>
      {editHref ? (
        <Button variant="outline" asChild>
          <Link href={editHref}>
            <Pencil className="h-4 w-4 mr-2" />
            Редактировать чек
          </Link>
        </Button>
      ) : null}
      <Button type="button" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" />
        Печать
      </Button>
    </div>
  )
}
