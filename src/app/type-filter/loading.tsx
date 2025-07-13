import { Skeleton } from '@/shared/components/ui/skeleton'
import FilterLayout from '@/shared/components/layouts/FilterLayout'

export default function TypeFilterLoading() {
  return (
    <FilterLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>

        <div className="rounded-lg border divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    </FilterLayout>
  )
} 