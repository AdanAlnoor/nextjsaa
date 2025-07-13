'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Database } from '@/shared/types/supabase'
import { createClient } from '@/shared/lib/supabase/client'

type Project = Database['public']['Tables']['projects']['Row']

interface EstimateTabProps {
  project: Project
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

export function EstimateTab({ project }: EstimateTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [estimateData, setEstimateData] = useState<any[]>([])
  const [structures, setStructures] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEstimateData = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

        // Load estimate structures for this project
        const { data: structureData, error: structureError } = await supabase
          .from('estimate_structures')
          .select('*')
          .eq('project_id', project.id)
          .order('order_index', { ascending: true })

        if (structureError) {
          console.error('Error loading structures:', structureError)
        } else {
          setStructures(structureData || [])
        }

        // Load estimate elements
        const { data: elementData, error: elementError } = await supabase
          .from('estimate_elements')
          .select(`
            *,
            estimate_structures(name)
          `)
          .eq('project_id', project.id)
          .order('order_index', { ascending: true })

        if (elementError) {
          console.error('Error loading elements:', elementError)
        } else {
          setEstimateData(elementData || [])
        }

      } catch (err) {
        setError('Failed to load estimate data')
        console.error('Error loading estimate data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadEstimateData()
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
  const totalEstimate = estimateData.reduce((sum, item) => sum + (item.amount || 0), 0)
  const itemCount = estimateData.length
  const structureCount = structures.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Project Estimate
        </h1>
        <p className="text-muted-foreground">
          Manage estimates for {project.name}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalEstimate.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Structures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {structureCount}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Elements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {itemCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structures">Structures</TabsTrigger>
          <TabsTrigger value="elements">Elements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estimate Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {estimateData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No estimate data available for this project.
                  </p>
                  <div className="space-x-2">
                    <Button variant="outline">
                      Import from Template
                    </Button>
                    <Button>
                      Create New Estimate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Estimate contains {structureCount} structures with {itemCount} total elements
                  </p>
                  
                  {/* Quick Summary Table */}
                  <div className="rounded-md border">
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <div className="grid grid-cols-3 gap-4 font-medium text-sm">
                        <div>Structure</div>
                        <div className="text-right">Elements</div>
                        <div className="text-right">Amount</div>
                      </div>
                    </div>
                    <div className="divide-y">
                      {structures.slice(0, 10).map((structure) => {
                        const structureElements = estimateData.filter(
                          el => el.structure_id === structure.id
                        )
                        const structureTotal = structureElements.reduce(
                          (sum, el) => sum + (el.amount || 0), 0
                        )
                        
                        return (
                          <div key={structure.id} className="px-4 py-3">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="font-medium">{structure.name}</div>
                              <div className="text-right">{structureElements.length}</div>
                              <div className="text-right font-medium">
                                ${structureTotal.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {structures.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing 10 of {structures.length} structures
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="structures">
          <Card>
            <CardHeader>
              <CardTitle>Estimate Structures</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Structure management functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="elements">
          <Card>
            <CardHeader>
              <CardTitle>Estimate Elements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Element management functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}