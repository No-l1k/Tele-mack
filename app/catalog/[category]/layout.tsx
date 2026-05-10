import type { Metadata } from 'next'

import { getCategoryBySlug } from '@/lib/data/catalog'

type CategoryLayoutProps = {
  children: React.ReactNode
  params: Promise<{ category: string }>
}

export async function generateMetadata({ params }: CategoryLayoutProps): Promise<Metadata> {
  const { category } = await params
  const categoryData = await getCategoryBySlug(category)
  if (!categoryData) {
    return {
      title: 'Категория не найдена',
    }
  }
  return {
    title: `${categoryData.name} - Каталог`,
    description: categoryData.description || `Товары категории ${categoryData.name}`,
  }
}

export default function CategoryLayout({ children }: CategoryLayoutProps) {
  return children
}
