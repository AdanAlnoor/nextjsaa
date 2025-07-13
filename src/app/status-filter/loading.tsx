import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import FilterLayout from '@/shared/components/layouts/FilterLayout'

export default function StatusFilterLoading() {
  return (
    <FilterLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>

        <div className="rounded-lg border divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </FilterLayout>
  )
} 