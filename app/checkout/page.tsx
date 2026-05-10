'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Truck, Store, Banknote, CreditCard, Building } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCart } from '@/context/cart-context'
import { formatPrice, formatItemsCount } from '@/lib/formatters'
import { ordersApi, publicSettingsApi, type CheckoutService } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media'
import { CARD_SURCHARGE_RATE, calculateDeliveryCost } from '@/lib/pricing'
import { saveOrderAccess } from '@/lib/order-access'
import { isCompleteRuPhone } from '@/lib/phone'
import type { DeliveryMethod, PaymentMethod } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, itemsCount, clearCart } = useCart()
  
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    city: 'г Москва',
    street: '',
    house: '',
    apartment: '',
    comment: '',
    deliveryMethod: 'courier' as DeliveryMethod,
    paymentMethod: 'cash' as PaymentMethod,
    pixelCheck: false,
    installation: false,
    becomeCustomer: false,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checkoutServices, setCheckoutServices] = useState<CheckoutService[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await publicSettingsApi.get()
        const allServices = Array.isArray(response.data.checkoutServices) ? response.data.checkoutServices : []
        const enabled = allServices
          .filter((service) => service && service.enabled)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        if (!cancelled) {
          setCheckoutServices(enabled)
        }
      } catch {
        if (!cancelled) {
          setCheckoutServices([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Calculate costs
  const deliveryCost = calculateDeliveryCost(total, formData.deliveryMethod)
  const paymentSurcharge = formData.paymentMethod === 'card' ? Math.round(total * CARD_SURCHARGE_RATE) : 0
  const selectedServices = useMemo(
    () => checkoutServices.filter((service) => selectedServiceIds.includes(service.id)),
    [checkoutServices, selectedServiceIds]
  )
  const servicesTotal = selectedServices.reduce((sum, service) => sum + service.price, 0)
  const finalTotal = total + deliveryCost + paymentSurcharge + servicesTotal

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Введите номер телефона'
    } else if (!isCompleteRuPhone(formData.phone)) {
      newErrors.phone = 'Введите номер полностью в формате +7 (999) 999-99-99'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Неверный формат email'
    }
    if (formData.deliveryMethod === 'courier') {
      if (!formData.street.trim()) {
        newErrors.street = 'Введите улицу'
      }
      if (!formData.house.trim()) {
        newErrors.house = 'Введите номер дома'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      const response = await ordersApi.create({
        ...formData,
        serviceIds: selectedServiceIds,
        pixelCheck: false,
        installation: false,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      })
      const orderId = response.data?.id || response.data?.number
      const orderToken = response.data?.publicToken

      if (orderId && orderToken) {
        saveOrderAccess({
          orderId: String(orderId),
          orderNumber: Number(response.data?.number ?? orderId),
          token: orderToken,
          createdAt: new Date().toISOString(),
        })
      }

      clearCart()
      router.push(`/order/${orderId}?token=${orderToken ?? ''}`)
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Не удалось оформить заказ',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const toggleService = (serviceId: string, enabled: boolean) => {
    setSelectedServiceIds((prev) => {
      if (enabled) {
        if (prev.includes(serviceId)) return prev
        return [...prev, serviceId]
      }
      return prev.filter((id) => id !== serviceId)
    })
  }

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Корзина пуста</h1>
            <p className="text-muted-foreground mb-6">
              Добавьте товары в корзину, чтобы оформить заказ
            </p>
            <Button asChild>
              <Link href="/catalog">Перейти в каталог</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Корзина', href: '/cart' },
              { label: 'Оформление заказа' },
            ]}
          />

          <div className="flex items-center justify-between mt-6 mb-8">
            <h1 className="text-2xl font-bold">Оформление заказа</h1>
            <Link 
              href="/cart"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться в корзину
            </Link>
          </div>

          {errors.form && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle>Контактные данные</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Контактный телефон *</Label>
                      <PhoneInput
                        id="phone"
                        value={formData.phone}
                        onValueChange={(value) => updateField('phone', value)}
                        className={errors.phone ? 'border-destructive' : ''}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Формат: +7 (999) 999-99-99
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="name">Контактное лицо (ФИО) *</Label>
                      <Input
                        id="name"
                        placeholder="Иван Иванов"
                        value={formData.name}
                        onChange={e => updateField('name', e.target.value)}
                        className={errors.name ? 'border-destructive' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive mt-1">{errors.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@mail.ru"
                        value={formData.email}
                        onChange={e => updateField('email', e.target.value)}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive mt-1">{errors.email}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery */}
                <Card>
                  <CardHeader>
                    <CardTitle>Доставка</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="city">Населенный пункт *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={e => updateField('city', e.target.value)}
                      />
                    </div>

                    <RadioGroup
                      value={formData.deliveryMethod}
                      onValueChange={(value) => updateField('deliveryMethod', value)}
                    >
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <RadioGroupItem value="courier" id="courier" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="courier" className="flex items-center gap-2 font-medium cursor-pointer">
                            <Truck className="h-4 w-4 text-primary" />
                            Курьером
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Стоимость курьерской доставки по Москве и МО - 1 000 руб. За пределами МКАД дополнительно оплачивается 50 руб/км. Для отправки по России действует 100% предоплата после расчета стоимости транспортной компанией.
                          </p>
                          <p className="text-sm text-primary mt-1">
                            Минимальная сумма заказа - 1 руб
                          </p>
                        </div>
                        <div className="font-medium">+ 1 000 руб</div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="pickup" className="flex items-center gap-2 font-medium cursor-pointer">
                            <Store className="h-4 w-4 text-primary" />
                            Самовывоз
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Забрать заказ можно по адресу: г. Москва, ул. Примерная, д. 1
                          </p>
                        </div>
                        <div className="font-medium">+ 0 руб</div>
                      </div>
                    </RadioGroup>

                    {formData.deliveryMethod === 'courier' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="sm:col-span-2">
                          <Label htmlFor="street">Улица *</Label>
                          <Input
                            id="street"
                            placeholder="ул. Примерная"
                            value={formData.street}
                            onChange={e => updateField('street', e.target.value)}
                            className={errors.street ? 'border-destructive' : ''}
                          />
                          {errors.street && (
                            <p className="text-sm text-destructive mt-1">{errors.street}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="house">Дом *</Label>
                          <Input
                            id="house"
                            placeholder="10"
                            value={formData.house}
                            onChange={e => updateField('house', e.target.value)}
                            className={errors.house ? 'border-destructive' : ''}
                          />
                          {errors.house && (
                            <p className="text-sm text-destructive mt-1">{errors.house}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="apartment">Квартира</Label>
                          <Input
                            id="apartment"
                            placeholder="25"
                            value={formData.apartment}
                            onChange={e => updateField('apartment', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="comment">Комментарий к заказу</Label>
                      <Textarea
                        id="comment"
                        placeholder="Дополнительная информация..."
                        value={formData.comment}
                        onChange={e => updateField('comment', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Services */}
                <Card>
                  <CardHeader>
                    <CardTitle>Дополнительные услуги</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {checkoutServices.length > 0 ? (
                      checkoutServices.map((service) => {
                        const serviceId = `service-${service.id}`
                        const checked = selectedServiceIds.includes(service.id)
                        return (
                          <div key={service.id} className="flex items-start gap-3">
                            <Checkbox
                              id={serviceId}
                              checked={checked}
                              onCheckedChange={(value) => toggleService(service.id, Boolean(value))}
                            />
                            <div>
                              <Label htmlFor={serviceId} className="cursor-pointer">
                                {service.name} ({formatPrice(service.price)})
                              </Label>
                              {service.description && (
                                <p className="text-sm text-muted-foreground">{service.description}</p>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">Дополнительные услуги пока не настроены.</p>
                    )}
                    
                    <div className="flex items-start gap-3 pt-4 border-t">
                      <Checkbox
                        id="becomeCustomer"
                        checked={formData.becomeCustomer}
                        onCheckedChange={(checked) => updateField('becomeCustomer', checked as boolean)}
                      />
                      <div>
                        <Label htmlFor="becomeCustomer" className="cursor-pointer">
                          Стать постоянным покупателем
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Вы сможете видеть историю заказов, проще делать новые и получать скидки
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Способ оплаты *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={formData.paymentMethod}
                      onValueChange={(value) => updateField('paymentMethod', value)}
                    >
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <Banknote className="h-4 w-4 text-green-600" />
                          Наличными курьеру при получении
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          Безналичная оплата (+15%)
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <RadioGroupItem value="pickup" id="payPickup" />
                        <Label htmlFor="payPickup" className="flex items-center gap-2 flex-1 cursor-pointer">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          Оплата в точке самовывоза
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </div>

              {/* Order summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Ваш заказ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {items.map(item => (
                        <div key={item.product.id} className="flex gap-3">
                          <div className="flex-shrink-0 w-12 h-12 bg-muted/30 rounded overflow-hidden">
                            <Image
                              src={resolveMediaUrl(item.product.images[0])}
                              alt={item.product.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">
                              {item.product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} x {formatPrice(item.product.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Сумма по товарам ({formatItemsCount(itemsCount)})
                        </span>
                        <span>{formatPrice(total)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Стоимость доставки</span>
                        <span>{deliveryCost === 0 ? 'Бесплатно' : formatPrice(deliveryCost)}</span>
                      </div>
                      
                      {paymentSurcharge > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Наценка за оплату картой</span>
                          <span>{formatPrice(paymentSurcharge)}</span>
                        </div>
                      )}
                      
                      {selectedServices.map((service) => (
                        <div key={service.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{service.name}</span>
                          <span>{formatPrice(service.price)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Итого:</span>
                        <span className="text-2xl font-bold">{formatPrice(finalTotal)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Оформление...' : 'Подтвердить заказ'}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Нажимая кнопку, вы соглашаетесь с{' '}
                      <Link href="/privacy" className="underline">
                        политикой конфиденциальности
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
