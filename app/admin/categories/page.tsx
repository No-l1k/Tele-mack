'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProductImage } from '@/components/ui/product-image'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { categoriesApi } from '@/lib/api'
import type { Category } from '@/types'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export default function AdminCategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [image, setImage] = useState('')
  const [parentId, setParentId] = useState('')
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editImage, setEditImage] = useState('')
  const [editParentId, setEditParentId] = useState('')
  const [showOnHome, setShowOnHome] = useState(false)
  const [editShowOnHome, setEditShowOnHome] = useState(false)
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)

  const categoriesWithCount = useMemo(() => categories, [categories])

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.getAll()
      setCategories(res.data)
    } catch (error) {
      console.error('Failed to load categories', error)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const createdResponse = await categoriesApi.create({
        name,
        slug: slugify(slug || name),
        image,
        order: categories.length + 1,
        parentId: parentId ? Number(parentId) : undefined,
        showOnHome,
      })
      const created = createdResponse.data
      if (created && newImageFile) {
        await categoriesApi.uploadImage(created.id, newImageFile)
      }
      setName('')
      setSlug('')
      setImage('')
      setParentId('')
      setShowOnHome(false)
      setNewImageFile(null)
      setIsDialogOpen(false)
      await loadCategories()
    } catch (error) {
      console.error('Failed to create category', error)
      alert('Не удалось создать категорию')
    }
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setEditName(category.name)
    setEditSlug(category.slug)
    setEditImage(category.image || '')
    setEditParentId(category.parentId || '')
    setEditShowOnHome(Boolean(category.showOnHome))
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    try {
      await categoriesApi.update(editingCategory.id, {
        name: editName,
        slug: slugify(editSlug || editName),
        image: editImage || undefined,
        parentId: editParentId ? Number(editParentId) : null,
        showOnHome: editShowOnHome,
      })
      if (editImageFile) {
        await categoriesApi.uploadImage(editingCategory.id, editImageFile)
      }
      setIsEditDialogOpen(false)
      setEditingCategory(null)
      setEditImageFile(null)
      await loadCategories()
    } catch (error) {
      console.error('Failed to update category', error)
      alert('Не удалось обновить категорию')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить категорию?')) return
    try {
      await categoriesApi.delete(id)
      await loadCategories()
    } catch (error: any) {
      alert(error?.message || 'Не удалось удалить категорию')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Категории</h1>
          <p className="text-muted-foreground">
            Управление категориями товаров
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить категорию
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая категория</DialogTitle>
              <DialogDescription>
                Заполните данные категории и при необходимости привяжите её к родительской.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input id="name" placeholder="Например: Телевизоры" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL-адрес</Label>
                <Input id="slug" placeholder="televizory" value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Иконка (URL)</Label>
                <Input id="icon" placeholder="https://..." value={image} onChange={(e) => setImage(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon-file">Иконка (файл)</Label>
                <Input id="icon-file" type="file" accept="image/*" onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Родительская категория (подкатегория)</Label>
                <select
                  id="parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Без родителя</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-on-home"
                  checked={showOnHome}
                  onCheckedChange={(checked) => setShowOnHome(Boolean(checked))}
                />
                <Label htmlFor="show-on-home" className="cursor-pointer">
                  Показывать на главной странице
                </Label>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  Создать
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать категорию</DialogTitle>
              <DialogDescription>
                Измените название, URL и параметры отображения категории.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleUpdate}>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Название</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">URL-адрес</Label>
                <Input id="edit-slug" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image">Иконка (URL)</Label>
                <Input id="edit-image" value={editImage} onChange={(e) => setEditImage(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image-file">Иконка (файл)</Label>
                <Input id="edit-image-file" type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parent">Родительская категория</Label>
                <select
                  id="edit-parent"
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Без родителя</option>
                  {categories
                    .filter((cat) => cat.id !== editingCategory?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-show-on-home"
                  checked={editShowOnHome}
                  onCheckedChange={(checked) => setEditShowOnHome(Boolean(checked))}
                />
                <Label htmlFor="edit-show-on-home" className="cursor-pointer">
                  Показывать на главной странице
                </Label>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  Сохранить
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Иконка</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Товаров</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesWithCount.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {category.image ? (
                          <ProductImage
                            src={category.image}
                            alt={category.name}
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        ) : (
                          <Tags className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {category.parentId ? `— ${category.name}` : category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      /catalog/{category.slug}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{category.productCount} товаров</Badge>
                        {category.showOnHome && <Badge>Главная</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
