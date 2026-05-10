'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usersApi } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { Search } from 'lucide-react'
import type { User } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const response = await usersApi.getAll(1, 200)
        setUsers(response.data)
      } catch {
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => users.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.phone.includes(searchQuery) || (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())), [users, searchQuery])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Пользователи</h1>
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Поиск..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isLoading && <p className="text-muted-foreground py-4">Загрузка...</p>}
        </CardContent>
      </Card>
    </div>
  )
}

