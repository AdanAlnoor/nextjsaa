import DefaultLayout from '@/shared/components/layouts/DefaultLayout'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/shared/components/ui/card'

export default function ProfileLoading() {
  return (
    <DefaultLayout>
      <div className="max-w-2xl mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DefaultLayout>
  )
} 