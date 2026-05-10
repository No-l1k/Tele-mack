'use client'

import Link from 'next/link'
import { Clock3 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/*
Legacy auth UI/code (temporarily disabled for MVP).
Kept here intentionally so it can be quickly restored later.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const router = useRouter()
const [isLoading, setIsLoading] = useState(false)
const [loginData, setLoginData] = useState({ phone: '' })
const [registerData, setRegisterData] = useState({ phone: '', name: '', email: '' })

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  await new Promise((resolve) => setTimeout(resolve, 1000))
  router.push('/account')
  setIsLoading(false)
}

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  await new Promise((resolve) => setTimeout(resolve, 1000))
  router.push('/account')
  setIsLoading(false)
}

<CardContent>
  <Tabs defaultValue="login">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="login">Вход</TabsTrigger>
      <TabsTrigger value="register">Регистрация</TabsTrigger>
    </TabsList>
    <TabsContent value="login">
      <form onSubmit={handleLogin} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="login-phone">Номер телефона</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="login-phone" type="tel" placeholder="+7(999)999-99-99" required />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Вход...' : 'Войти'}
        </Button>
      </form>
    </TabsContent>
    <TabsContent value="register">
      <form onSubmit={handleRegister} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="register-phone">Номер телефона *</Label>
          <Input id="register-phone" type="tel" placeholder="+7(999)999-99-99" required />
        </div>
        <div>
          <Label htmlFor="register-name">Ваше имя *</Label>
          <Input id="register-name" placeholder="Иван Иванов" required />
        </div>
        <div>
          <Label htmlFor="register-email">Email</Label>
          <Input id="register-email" type="email" placeholder="example@mail.ru" />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
      </form>
    </TabsContent>
  </Tabs>
</CardContent>
*/

export default function AuthPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/30 flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Личный кабинет</CardTitle>
              <CardDescription>
                Раздел находится в доработке
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground mb-2">
                  <Clock3 className="h-4 w-4" />
                  Временно недоступно
                </div>
                Авторизация и регистрация в личном кабинете будут добавлены позже. Сейчас вы можете проверять заказ по номеру и телефону.
              </div>
              <Button asChild className="w-full">
                <Link href="/orders">Проверить заказ</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/contacts">Связаться с нами</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
