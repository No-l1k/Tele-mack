'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ordersApi } from '@/lib/api'
import { formatPrice, formatDate, formatOrderStatus, getOrderStatusColor } from '@/lib/formatters'
import { 
  Search, 
  MoreHorizontal, 
  Eye,
  Printer,
  CheckCircle,
  Truck,
  XCircle,
  Filter,
} from 'lucide-react'
import Link from 'next/link'
import type { Order, OrderStatus } from '@/types'
import { toast } from '@/lib/toast'

const orderStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

const paymentLabels: Record<string, string> = {
  cash: 'Наличными',
  card: 'Безналичная',
  pickup: 'При самовывозе',
}

export default function AdminOrdersPage() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const statusFromUrl = searchParams.get('status')
    if (statusFromUrl && orderStatuses.includes(statusFromUrl as OrderStatus)) {
      setStatusFilter(statusFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadOrders() {
      try {
        setIsLoading(true)
        const response = await ordersApi.getAll({ page: 1, pageSize: 100 })
        if (!cancelled) {
          setOrders(response.data)
        }
      } catch {
        if (!cancelled) {
          setOrders([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadOrders()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const orderId = String(order.id)
    const matchesSearch = 
      orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.phone.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  }), [orders, searchQuery, statusFilter])

  const setOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const response = await ordersApi.updateStatus(orderId, status)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? response.data : order)))
      toast.success('Статус заказа обновлен')
    } catch (error) {
      toast.error('Не удалось обновить статус', error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Заказы</h1>
        <p className="text-muted-foreground">
          Управление заказами магазина
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {orderStatuses.map((status) => {
          const count = orders.filter((o) => o.status === status).length
          return (
            <Card 
              key={status} 
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                statusFilter === status ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge className={getOrderStatusColor(status)} variant="secondary">
                    {formatOrderStatus(status)}
                  </Badge>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру или клиенту..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {orderStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatOrderStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Оплата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{order.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {paymentLabels[order.paymentMethod] || order.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getOrderStatusColor(order.status)} variant="secondary">
                        {formatOrderStatus(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                              <Link href={`/admin/orders/${order.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Подробнее
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/orders/${order.id}/print`}>
                              <Printer className="h-4 w-4 mr-2" />
                              Товарный чек
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setOrderStatus(order.id, 'confirmed')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Подтвердить
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setOrderStatus(order.id, 'shipped')}>
                            <Truck className="h-4 w-4 mr-2" />
                            Отправить
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setOrderStatus(order.id, 'cancelled')}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Отменить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Загрузка заказов...</div>
          )}

          {!isLoading && filteredOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Заказы не найдены
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
