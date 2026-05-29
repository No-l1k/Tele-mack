'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ProductImage } from '@/components/ui/product-image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PhoneInput } from '@/components/ui/phone-input'
import { formatPrice } from '@/lib/formatters'
import { ordersApi, productsApi, publicSettingsApi, type CheckoutService } from '@/lib/api'
import { CARD_SURCHARGE_RATE, calculateDeliveryCost } from '@/lib/pricing'
import {
  LEGACY_TV_CHECKOUT_SERVICE_IDS,
  buildTvCheckoutServices,
} from '@/lib/tv-checkout-services'
import type { CartItem, DeliveryMethod, Order, PaymentMethod, Product } from '@/types'
import { ArrowLeft, Loader2, Package, Plus, Save, Search, Trash2 } from 'lucide-react'

type LineItem = {
  productId: string
  quantity: number
  product?: Product
}

export default function AdminOrderEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [storeCheckoutServices, setStoreCheckoutServices] = useState<CheckoutService[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)

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
  })

  const loadOrder = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [orderRes, settingsRes] = await Promise.all([
        ordersApi.getById(id),
        publicSettingsApi.get(),
      ])
      const order: Order = orderRes.data
      const allServices = Array.isArray(settingsRes.data.checkoutServices)
        ? settingsRes.data.checkoutServices
        : []
      setStoreCheckoutServices(
        allServices.filter((s) => s && s.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
      )

      const uniqueIds = [...new Set(order.items.map((i) => String(i.productId)))]
      const productResults = await Promise.all(
        uniqueIds.map(async (productId) => {
          try {
            const res = await productsApi.getById(productId)
            return res.data
          } catch {
            return null
          }
        })
      )
      const productsById = new Map(
        productResults.filter((p): p is Product => p != null).map((p) => [String(p.id), p])
      )

      setLineItems(
        order.items.map((item) => ({
          productId: String(item.productId),
          quantity: item.quantity,
          product: productsById.get(String(item.productId)),
        }))
      )

      const serviceIds = (order.selectedServices ?? []).map((s) => s.id)
      setSelectedServiceIds(serviceIds)

      setFormData({
        phone: order.customer.phone,
        name: order.customer.name,
        email: order.customer.email ?? '',
        city: order.address?.city ?? 'г Москва',
        street: order.address?.street ?? '',
        house: order.address?.house ?? '',
        apartment: order.address?.apartment ?? '',
        comment: order.comment ?? '',
        deliveryMethod: order.deliveryMethod,
        paymentMethod: order.paymentMethod,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить заказ')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  useEffect(() => {
    const query = productSearch.trim()
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await productsApi.search(query)
        setSearchResults(res.data ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  const cartItems: CartItem[] = useMemo(
    () =>
      lineItems
        .filter((line) => line.product)
        .map((line) => ({
          product: line.product!,
          quantity: line.quantity,
        })),
    [lineItems]
  )

  const legacyTvServiceIds = useMemo(() => new Set<string>(LEGACY_TV_CHECKOUT_SERVICE_IDS), [])

  const checkoutServices = useMemo(() => {
    const storeServices = storeCheckoutServices.filter(
      (service) => !legacyTvServiceIds.has(service.id)
    )
    const tvServices = buildTvCheckoutServices(cartItems)
    return [...tvServices, ...storeServices].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [cartItems, legacyTvServiceIds, storeCheckoutServices])

  const availableServiceIds = useMemo(
    () => new Set(checkoutServices.map((s) => s.id)),
    [checkoutServices]
  )

  useEffect(() => {
    setSelectedServiceIds((prev) => prev.filter((sid) => availableServiceIds.has(sid)))
  }, [availableServiceIds])

  const subtotal = useMemo(
    () =>
      lineItems.reduce((sum, line) => {
        const price = line.product?.price ?? 0
        return sum + price * line.quantity
      }, 0),
    [lineItems]
  )

  const deliveryCost = calculateDeliveryCost(subtotal, formData.deliveryMethod)
  const paymentSurcharge =
    formData.paymentMethod === 'card' ? Math.round(subtotal * CARD_SURCHARGE_RATE) : 0
  const selectedServices = checkoutServices.filter((s) => selectedServiceIds.includes(s.id))
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const finalTotal = subtotal + deliveryCost + paymentSurcharge + servicesTotal

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setLineItems((prev) =>
      prev.map((line) =>
        line.productId === productId ? { ...line, quantity: Math.min(quantity, 999) } : line
      )
    )
  }

  const removeLine = (productId: string) => {
    setLineItems((prev) => prev.filter((line) => line.productId !== productId))
  }

  const addProduct = (product: Product) => {
    const pid = String(product.id)
    setLineItems((prev) => {
      const existing = prev.find((line) => line.productId === pid)
      if (existing) {
        return prev.map((line) =>
          line.productId === pid ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [...prev, { productId: pid, quantity: 1, product }]
    })
    setProductSearch('')
    setSearchResults([])
  }

  const handleSave = async () => {
    if (lineItems.length === 0) {
      setError('Добавьте хотя бы один товар')
      return
    }
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Укажите имя и телефон покупателя')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await ordersApi.update(id, {
        items: lineItems.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        phone: formData.phone,
        name: formData.name,
        email: formData.email || undefined,
        city: formData.city,
        street: formData.street,
        house: formData.house,
        apartment: formData.apartment || undefined,
        comment: formData.comment || undefined,
        deliveryMethod: formData.deliveryMethod,
        paymentMethod: formData.paymentMethod,
        serviceIds: selectedServiceIds,
        pixelCheck: false,
        installation: false,
      })
      router.push(`/admin/orders/${id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить заказ')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Загрузка заказа…</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/admin/orders/${id}`}>
          <Button variant="ghost" size="icon" type="button">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Редактирование заказа #{id}</h1>
          <p className="text-muted-foreground text-sm">
            После сохранения товарный чек обновится автоматически
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Товары
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет позиций — добавьте товар ниже</p>
          ) : (
            lineItems.map((line) => (
              <div
                key={line.productId}
                className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="h-12 w-12 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {line.product?.images?.[0] ? (
                    <ProductImage
                      src={line.product.images[0]}
                      alt={line.product.name}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="font-medium text-sm">
                    {line.product?.name ?? `Товар #${line.productId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {line.product ? formatPrice(line.product.price) : '—'} за шт.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`qty-${line.productId}`} className="sr-only">
                    Количество
                  </Label>
                  <Input
                    id={`qty-${line.productId}`}
                    type="number"
                    min={1}
                    max={999}
                    className="w-20"
                    value={line.quantity}
                    onChange={(e) =>
                      updateQuantity(line.productId, parseInt(e.target.value, 10) || 1)
                    }
                  />
                </div>
                <p className="font-semibold min-w-[100px] text-right">
                  {line.product
                    ? formatPrice(line.product.price * line.quantity)
                    : '—'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(line.productId)}
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}

          <div className="pt-4 border-t space-y-2">
            <Label htmlFor="product-search">Добавить товар</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                placeholder="Поиск по названию…"
                className="pl-9"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            {isSearching && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Поиск…
              </p>
            )}
            {searchResults.length > 0 && (
              <ul className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left"
                      onClick={() => addProduct(product)}
                    >
                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                      <span className="flex-1 text-sm">{product.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(product.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дополнительные услуги</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checkoutServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных услуг</p>
          ) : (
            checkoutServices.map((service) => (
              <div key={service.id} className="flex items-start gap-3">
                <Checkbox
                  id={`service-${service.id}`}
                  checked={selectedServiceIds.includes(service.id)}
                  onCheckedChange={(checked) => {
                    setSelectedServiceIds((prev) =>
                      checked
                        ? [...prev, service.id]
                        : prev.filter((sid) => sid !== service.id)
                    )
                  }}
                />
                <Label htmlFor={`service-${service.id}`} className="font-normal cursor-pointer">
                  {service.name} — {formatPrice(service.price)}
                </Label>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Покупатель и доставка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <PhoneInput
                id="phone"
                value={formData.phone}
                onChange={(value) => setFormData((p) => ({ ...p, phone: value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Способ доставки</Label>
            <RadioGroup
              value={formData.deliveryMethod}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, deliveryMethod: v as DeliveryMethod }))
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="courier" id="delivery-courier" />
                <Label htmlFor="delivery-courier" className="font-normal">
                  Курьером
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pickup" id="delivery-pickup" />
                <Label htmlFor="delivery-pickup" className="font-normal">
                  Самовывоз
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.deliveryMethod === 'courier' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Улица</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData((p) => ({ ...p, street: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="house">Дом</Label>
                <Input
                  id="house"
                  value={formData.house}
                  onChange={(e) => setFormData((p) => ({ ...p, house: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apartment">Квартира</Label>
                <Input
                  id="apartment"
                  value={formData.apartment}
                  onChange={(e) => setFormData((p) => ({ ...p, apartment: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Способ оплаты</Label>
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, paymentMethod: v as PaymentMethod }))
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cash" id="pay-cash" />
                <Label htmlFor="pay-cash" className="font-normal">
                  Наличными
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="card" id="pay-card" />
                <Label htmlFor="pay-card" className="font-normal">
                  Безнал (+15%)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pickup" id="pay-pickup" />
                <Label htmlFor="pay-pickup" className="font-normal">
                  При самовывозе
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              rows={3}
              value={formData.comment}
              onChange={(e) => setFormData((p) => ({ ...p, comment: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Товары</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Доставка</span>
            <span>{deliveryCost > 0 ? formatPrice(deliveryCost) : 'Бесплатно'}</span>
          </div>
          {paymentSurcharge > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Наценка за оплату</span>
              <span>{formatPrice(paymentSurcharge)}</span>
            </div>
          )}
          {servicesTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Услуги</span>
              <span>{formatPrice(servicesTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Итого</span>
            <span className="text-primary">{formatPrice(finalTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pb-8">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Сохранить изменения
        </Button>
        <Button variant="outline" asChild disabled={isSaving}>
          <Link href={`/admin/orders/${id}`}>Отмена</Link>
        </Button>
      </div>
    </div>
  )
}
