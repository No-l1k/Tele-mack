'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Rating } from '@/components/ui/rating'
import { reviewsApi } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { CheckCircle, XCircle } from 'lucide-react'
import type { Review } from '@/types'

export default function AdminReviewsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadReviews = async () => {
    try {
      setIsLoading(true)
      const response = await reviewsApi.getAll({ page: 1 })
      setReviews(response.data)
    } catch {
      setReviews([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const filtered = useMemo(() => reviews.filter((review) => {
    if (statusFilter === 'approved') return review.approved
    if (statusFilter === 'pending') return !review.approved
    return true
  }), [reviews, statusFilter])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Отзывы</h1>
      <Card>
        <CardHeader>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все отзывы</SelectItem>
              <SelectItem value="pending">На модерации</SelectItem>
              <SelectItem value="approved">Одобренные</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoading && filtered.map((review) => (
            <div key={review.id} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{review.userName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
                <Rating value={review.rating} size="sm" />
              </div>
              <p className="text-sm">{review.text}</p>
              <div className="flex items-center gap-2">
                {!review.approved && (
                  <Button size="sm" variant="outline" onClick={() => reviewsApi.approve(review.id).then(loadReviews)}>
                    <CheckCircle className="h-4 w-4 mr-1" />Одобрить
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => reviewsApi.delete(review.id).then(loadReviews)}>
                  <XCircle className="h-4 w-4 mr-1" />Удалить
                </Button>
              </div>
            </div>
          ))}
          {isLoading && <p className="text-muted-foreground">Загрузка...</p>}
        </CardContent>
      </Card>
    </div>
  )
}

