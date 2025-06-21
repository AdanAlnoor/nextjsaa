'use client'

import { useState, Suspense } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Database } from '@/types/supabase'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TabNavigation } from './components/TabNavigation'
import { SummaryTable } from './components/SummaryTable'
import { useSummaryData } from './hooks/useSummaryData'
import { useSummaryDetailData } from './hooks/useSummaryDetailData'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SummaryOverview } from './components/SummaryOverview'
import { RefreshButton } from './components/RefreshButton'
import { FixOrphanedElementsButton } from './components/FixOrphanedElementsButton'

type Project = Database['public']['Tables']['projects']['Row']

interface SummaryTabProps {
  project: Project
}

// Create a client with retry configuration to handle network issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: 1000,
    },
  },
})

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="border rounded-md">
        <div className="bg-gray-100 p-3">
          <div className="flex">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-6 flex-1 mx-2" />
            ))}
          </div>
        </div>
        <div className="p-2 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex py-1">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-5 flex-1 mx-2" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryContent({ project }: SummaryTabProps) {
  const [activeTab, setActiveTab] = useState('list')
  
  const { 
    items: flattenedItems, 
    summaryData, 
    isLoading, 
    isError,
    expandedItems,
    onToggleExpand,
    refetch
  } = useSummaryDetailData(project.id)
  
  // Count orphaned level 1 items (level 1 items at top level)
  const orphanedElements = flattenedItems.filter(item => item.level === 1 && !item.hasOwnProperty('parent_id')).length
  
  // Handle export functionality
  const handleExport = () => {
    // Create CSV data
    const headers = ['Name', 'Original', 'Actual', 'Difference', 'Paid Bills', 'External Bills', 'Pending Bills']
    const rows = flattenedItems.map(item => [
      item.name,
      item.original.toString(),
      item.actual.toString(),
      item.difference.toString(),
      item.paidBills.toString(),
      item.externalBills.toString(),
      item.pendingBills.toString()
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${project.name}-budget-summary.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const TABS = [
    { id: 'list', label: 'List' },
    { id: 'cost-code', label: 'By Cost Code' },
  ]
  
  if (isLoading) {
    return <SkeletonLoader />
  }
  
  if (isError) {
    return (
      <div className="p-6 text-center rounded-md border border-red-200 bg-red-50 text-red-600">
        <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
        <p>There was a problem loading the budget data. Please try refreshing the page.</p>
      </div>
    )
  }

  if (flattenedItems.length === 0) {
    return (
      <div className="p-6 text-center rounded-md border border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">No Budget Data Available</h3>
        <p className="text-gray-600 mb-4">
          There are no budget items available for this project yet. Please create budget items manually or contact support for assistance.
        </p>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded mb-4 text-left max-w-md mx-auto">
          <h4 className="font-medium text-blue-700 mb-1">Budget Management</h4>
          <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
            <li>Budget items are organized in a hierarchical structure</li>
            <li>Level 0 items (Structures) represent major categories</li>
            <li>Level 1 items (Elements) are specific line items</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SummaryOverview projectId={project.id} />
      
      {orphanedElements > 0 && (
        <div className="p-4 mb-4 rounded-md bg-amber-50 border border-amber-200">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Element/Structure Mismatch</h3>
              <p className="text-amber-700 text-sm">
                There {orphanedElements === 1 ? 'is' : 'are'} {orphanedElements} element{orphanedElements === 1 ? '' : 's'} that {orphanedElements === 1 ? 'doesn\'t' : 'don\'t'} have a matching parent structure. 
                This can happen when the parent structures haven't been properly synced. Try refreshing the data below or fixing the orphaned elements.
              </p>
              <div className="mt-2 flex space-x-2">
                <RefreshButton projectId={project.id} onSuccess={refetch} />
                <FixOrphanedElementsButton 
                  projectId={project.id} 
                  orphanedElementsCount={orphanedElements} 
                  onSuccess={() => refetch()} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <TabNavigation 
          tabs={TABS} 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
          onClick={handleExport}
        >
          <Download size={14} />
          <span className="text-sm font-medium">Export</span>
        </Button>
      </div>
      
      <Tabs value={activeTab} className="w-full">
        <TabsContent value="list">
          
          <TooltipProvider>
            <SummaryTable 
              items={flattenedItems} 
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
            />
          </TooltipProvider>
        </TabsContent>
        
        <TabsContent value="cost-code">
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Cost Code view is currently in development.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Wrap the component with the QueryClientProvider
export function SummaryTab(props: SummaryTabProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<SkeletonLoader />}>
        <SummaryContent {...props} />
      </Suspense>
    </QueryClientProvider>
  )
} 