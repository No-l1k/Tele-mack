import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function CatalogLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text="Загрузка каталога..." />
    </div>
  )
}
