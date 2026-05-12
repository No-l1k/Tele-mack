'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { publicSettingsApi } from '@/lib/api'
import { isCompleteRuPhone } from '@/lib/phone'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  MessageCircle,
  Send,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'

export default function ContactsPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    if (!isCompleteRuPhone(formData.phone)) {
      setError('Введите телефон полностью в формате +7 (999) 999-99-99')
      setIsSubmitting(false)
      return
    }

    try {
      await publicSettingsApi.sendContactRequest({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        subject: formData.subject.trim() || undefined,
        message: formData.message.trim(),
      })
      setIsSubmitted(true)
      setFormData({ name: '', phone: '', email: '', subject: '', message: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить сообщение')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Контакты' },
            ]}
          />

          <h1 className="text-3xl font-bold mt-6 mb-8">Контакты</h1>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Свяжитесь с нами</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Link 
                    href="tel:+79268023497"
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Телефон</p>
                      <p className="text-lg font-medium">+7 (926) 802-34-97</p>
                    </div>
                  </Link>

                  <Link 
                    href="https://wa.me/79268023497"
                    target="_blank"
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">WhatsApp</p>
                      <p className="text-lg font-medium">Написать в WhatsApp</p>
                    </div>
                  </Link>

                  <Link 
                    href="mailto:tele-makc@yandex.ru"
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-lg font-medium">tele-makc@yandex.ru</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Адрес</p>
                      <p className="text-muted-foreground">
                        г. Москва, ул. Прасковьина, 21
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Режим работы</p>
                      <p className="text-muted-foreground">
                        Пн-Пт: 10:00 - 20:00<br />
                        Сб-Вс: 11:00 - 18:00
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Напишите нам</CardTitle>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Сообщение отправлено!</h3>
                    <p className="text-muted-foreground mb-4">
                      Мы свяжемся с вами в ближайшее время
                    </p>
                    <Button variant="outline" onClick={() => {
                      setError('')
                      setIsSubmitted(false)
                    }}>
                      Отправить еще
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ваше имя *</Label>
                      <Input
                        id="name"
                        placeholder="Иван Иванов"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Телефон *</Label>
                        <PhoneInput
                          id="phone"
                          value={formData.phone}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Тема обращения</Label>
                      <Input
                        id="subject"
                        placeholder="Вопрос о товаре, заказе и т.д."
                        value={formData.subject}
                        onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Сообщение *</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Опишите ваш вопрос или пожелание..."
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                        required
                      />
                    </div>

                    {error && <p className="text-sm text-destructive text-center">{error}</p>}

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Отправляем...' : 'Отправить сообщение'}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Как нас найти</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              {/* min-w-0 + max-w-full у iframe: иначе виджет Яндекса может задать min-width и вынести страницу за край экрана */}
              <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-lg border">
                <iframe
                  src="https://yandex.ru/map-widget/v1/?um=constructor%3A32c58273987773c9dc294bbd7649830bbc12dd09da0cafa4be5a8af8866eb7ca&source=constructor"
                  className="block h-[min(520px,65vh)] w-full max-w-full min-w-0 border-0 sm:h-[520px]"
                  loading="lazy"
                  title="Карта расположения магазина"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
