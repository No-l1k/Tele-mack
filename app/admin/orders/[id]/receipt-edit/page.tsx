'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ordersApi } from '@/lib/api'
import { formatPrice } from '@/lib/formatters'
import {
  buildReceiptSnapshotFromOrder,
  computeReceiptTotal,
  computeRowTotal,
} from '@/lib/receipt-snapshot'
import { siteConfig } from '@/lib/site'
import type { Order, ReceiptLineItem, ReceiptSnapshot } from '@/types'

type EditableRow = ReceiptLineItem & { key: string }

function createEmptyRow(): EditableRow {
  return {
    key: crypto.randomUUID(),
    sku: '',
    productName: '',
    unit: 'шт.',
    price: 0,
    quantity: 1,
    total: 0,
  }
}

function toEditableRows(rows: ReceiptLineItem[]): EditableRow[] {
  return rows.map((row) => ({ ...row, key: crypto.randomUUID() }))
}

function toSnapshot(form: ReceiptSnapshot, rows: EditableRow[]): ReceiptSnapshot {
  return {
    ...form,
    rows: rows.map(({ key: _key, ...row }) => row),
  }
}

export default function AdminOrderReceiptEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [meta, setMeta] = useState({
    supplier: siteConfig.name,
    buyer: '',
    phone: '',
    paymentMethodText: '',
    deliveryAddress: '',
    comment: '',
    deliveryNote: '',
    deliveryCost: 0,
    paymentSurcharge: 0,
    total: 0,
  })
  const [rows, setRows] = useState<EditableRow[]>([])

  const loadOrder = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await ordersApi.getById(id)
      const loadedOrder = response.data
      setOrder(loadedOrder)

      const snapshot =
        loadedOrder.receiptSnapshot ??
        buildReceiptSnapshotFromOrder(loadedOrder, siteConfig.name)

      setMeta({
        supplier: snapshot.supplier,
        buyer: snapshot.buyer,
        phone: snapshot.phone,
        paymentMethodText: snapshot.paymentMethodText,
        deliveryAddress: snapshot.deliveryAddress,
        comment: snapshot.comment ?? '',
        deliveryNote: snapshot.deliveryNote ?? '',
        deliveryCost: snapshot.deliveryCost,
        paymentSurcharge: snapshot.paymentSurcharge,
        total: snapshot.total,
      })
      setRows(toEditableRows(snapshot.rows))
    } catch {
      setError('Не удалось загрузить заказ')
      setOrder(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const computedTotal = useMemo(
    () =>
      computeReceiptTotal({
        rows,
        deliveryCost: meta.deliveryCost,
        paymentSurcharge: meta.paymentSurcharge,
      }),
    [rows, meta.deliveryCost, meta.paymentSurcharge],
  )

  const updateRow = (key: string, patch: Partial<EditableRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row
        const next = { ...row, ...patch }
        if ('price' in patch || 'quantity' in patch) {
          next.total = computeRowTotal(next.price, next.quantity)
        }
        return next
      }),
    )
  }

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)))
  }

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()])
  }

  const applyComputedTotal = () => {
    setMeta((prev) => ({ ...prev, total: computedTotal }))
  }

  const handleSave = async () => {
    if (!order) return
    if (!meta.supplier.trim() || !meta.buyer.trim() || !meta.phone.trim()) {
      setError('Заполните поставщика, покупателя и телефон')
      return
    }
    if (!meta.paymentMethodText.trim() || !meta.deliveryAddress.trim()) {
      setError('Заполните способ оплаты и адрес доставки')
      return
    }
    if (rows.some((row) => !row.productName.trim())) {
      setError('У каждой позиции должно быть название товара')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const payload = toSnapshot(
        {
          supplier: meta.supplier.trim(),
          buyer: meta.buyer.trim(),
          phone: meta.phone.trim(),
          paymentMethodText: meta.paymentMethodText.trim(),
          deliveryAddress: meta.deliveryAddress.trim(),
          comment: meta.comment.trim() || null,
          rows: [],
          deliveryCost: Math.max(0, Math.round(meta.deliveryCost)),
          deliveryNote: meta.deliveryNote.trim() || null,
          paymentSurcharge: Math.max(0, Math.round(meta.paymentSurcharge)),
          total: Math.max(0, Math.round(meta.total)),
        },
        rows,
      )
      await ordersApi.updateReceipt(id, payload)
      router.push(`/admin/orders/${id}/print`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить чек')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Сбросить правки чека и вернуть данные из заказа?')) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await ordersApi.resetReceipt(id)
      const loadedOrder = response.data
      setOrder(loadedOrder)
      const snapshot = buildReceiptSnapshotFromOrder(loadedOrder, siteConfig.name)
      setMeta({
        supplier: snapshot.supplier,
        buyer: snapshot.buyer,
        phone: snapshot.phone,
        paymentMethodText: snapshot.paymentMethodText,
        deliveryAddress: snapshot.deliveryAddress,
        comment: snapshot.comment ?? '',
        deliveryNote: snapshot.deliveryNote ?? '',
        deliveryCost: snapshot.deliveryCost,
        paymentSurcharge: snapshot.paymentSurcharge,
        total: snapshot.total,
      })
      setRows(toEditableRows(snapshot.rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сбросить чек')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Загрузка…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">{error ?? 'Заказ не найден'}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/orders">К списку заказов</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/orders/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Редактирование товарного чека</h1>
            <p className="text-sm text-muted-foreground">Заказ #{order.number}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/orders/${id}/print`}>Предпросмотр</Link>
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Сохранить чек
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-sm text-muted-foreground">
        Здесь редактируется только печатный товарный чек. Состав заказа в системе меняется на странице{' '}
        <Link href={`/admin/orders/${id}/edit`} className="text-primary hover:underline">
          редактирования заказа
        </Link>
        .
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Реквизиты чека</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplier">Поставщик</Label>
            <Input
              id="supplier"
              value={meta.supplier}
              onChange={(e) => setMeta((prev) => ({ ...prev, supplier: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer">Покупатель</Label>
            <Input
              id="buyer"
              value={meta.buyer}
              onChange={(e) => setMeta((prev) => ({ ...prev, buyer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              value={meta.phone}
              onChange={(e) => setMeta((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethodText">Способ оплаты</Label>
            <Input
              id="paymentMethodText"
              value={meta.paymentMethodText}
              onChange={(e) => setMeta((prev) => ({ ...prev, paymentMethodText: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="deliveryAddress">Адрес доставки</Label>
            <Input
              id="deliveryAddress"
              value={meta.deliveryAddress}
              onChange={(e) => setMeta((prev) => ({ ...prev, deliveryAddress: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              value={meta.comment}
              onChange={(e) => setMeta((prev) => ({ ...prev, comment: e.target.value }))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Позиции в таблице</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить строку
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          {rows.map((row, index) => (
            <div key={row.key} className="grid gap-3 rounded-lg border p-4 md:grid-cols-12">
              <div className="md:col-span-1 flex items-center text-sm text-muted-foreground">№{index + 1}</div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Артикул</Label>
                <Input value={row.sku} onChange={(e) => updateRow(row.key, { sku: e.target.value })} />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">Товар</Label>
                <Input
                  value={row.productName}
                  onChange={(e) => updateRow(row.key, { productName: e.target.value })}
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <Label className="text-xs">Ед.</Label>
                <Input value={row.unit} onChange={(e) => updateRow(row.key, { unit: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Цена</Label>
                <Input
                  type="number"
                  min={0}
                  value={row.price}
                  onChange={(e) => updateRow(row.key, { price: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <Label className="text-xs">Кол-во</Label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <Label className="text-xs">Сумма</Label>
                <Input
                  type="number"
                  min={0}
                  value={row.total}
                  onChange={(e) => updateRow(row.key, { total: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length <= 1}
                  aria-label="Удалить строку"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Доставка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryNote">Текст в строке доставки</Label>
              <Textarea
                id="deliveryNote"
                value={meta.deliveryNote}
                onChange={(e) => setMeta((prev) => ({ ...prev, deliveryNote: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryCost">Стоимость доставки</Label>
              <Input
                id="deliveryCost"
                type="number"
                min={0}
                value={meta.deliveryCost}
                onChange={(e) => setMeta((prev) => ({ ...prev, deliveryCost: Number(e.target.value) || 0 }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Итоги</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentSurcharge">Наценка за способ оплаты</Label>
              <Input
                id="paymentSurcharge"
                type="number"
                min={0}
                value={meta.paymentSurcharge}
                onChange={(e) =>
                  setMeta((prev) => ({ ...prev, paymentSurcharge: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total">Итого на чеке</Label>
              <Input
                id="total"
                type="number"
                min={0}
                value={meta.total}
                onChange={(e) => setMeta((prev) => ({ ...prev, total: Number(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Расчёт по строкам: {formatPrice(computedTotal)}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={applyComputedTotal}>
                Подставить расчётный итог
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
