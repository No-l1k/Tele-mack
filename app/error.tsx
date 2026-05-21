'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { RefreshCw, Home, AlertTriangle } from 'lucide-react'
import { STORE_PHONES } from '@/lib/store-contacts'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="text-center max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4">Что-то пошло не так</h1>
          <p className="text-muted-foreground mb-8">
            Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
            Пожалуйста, попробуйте обновить страницу.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-4">
              Код ошибки: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Попробовать снова
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                На главную
              </Link>
            </Button>
          </div>
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              Если проблема повторяется, свяжитесь с нами:
            </p>
            <p className="text-sm font-medium mt-2">
              {STORE_PHONES.map((p) => p.displayCompact).join(' · ')} · tele-makc@yandex.ru
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
