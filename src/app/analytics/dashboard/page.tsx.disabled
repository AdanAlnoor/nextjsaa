import { Suspense } from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { AnalyticsDashboard } from '@/shared/components/analytics/AnalyticsDashboard'

export default function AnalyticsDashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense 
        fallback={
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96 mt-2" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}
