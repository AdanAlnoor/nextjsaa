'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Database } from '@/shared/types/supabase'
import { fetchCostControlData } from '@/lib/services/cost-control-service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

type Project = Database['public']['Tables']['projects']['Row']

interface SummaryTabProps {
  project: Project
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

export function SummaryTab({ project }: SummaryTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [costData, setCostData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCostData = async () => {
      try {
        setIsLoading(true)
        const data = await fetchCostControlData(project.id)
        setCostData(data)
      } catch (err) {
        setError('Failed to load cost control data')
        console.error('Error loading cost control data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadCostData()
  }, [project.id])

  if (isLoading) {
    return <SkeletonLoader />
  }

  if (error) {
    return (
      <div className="p-6 text-center rounded-md border border-red-200 bg-red-50 text-red-600">
        <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    )
  }

  // Calculate summary metrics
  const totalBudget = costData.reduce((sum, item) => sum + (item.boAmount || 0), 0)
  const totalActual = costData.reduce((sum, item) => sum + (item.actual || 0), 0)
  const variance = totalBudget - totalActual

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBudget.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalActual.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(variance).toLocaleString()}
              {variance >= 0 ? ' under' : ' over'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Control Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {costData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No cost control data available for this project.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Import from Estimate
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Project has {costData.length} cost control items
                  </p>
                  <div className="rounded-md border">
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <div className="grid grid-cols-4 gap-4 font-medium text-sm">
                        <div>Item</div>
                        <div className="text-right">Budget</div>
                        <div className="text-right">Actual</div>
                        <div className="text-right">Variance</div>
                      </div>
                    </div>
                    <div className="divide-y">
                      {costData.slice(0, 10).map((item) => (
                        <div key={item.id} className="px-4 py-3">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-right">${(item.boAmount || 0).toLocaleString()}</div>
                            <div className="text-right">${(item.actual || 0).toLocaleString()}</div>
                            <div className={`text-right ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${Math.abs(item.difference || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {costData.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing 10 of {costData.length} items
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed cost control view coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 