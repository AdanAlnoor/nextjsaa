'use client'

import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import { useProjectSummary } from '../hooks/useProjectSummary'
import { formatCurrency } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import { refreshProjectSummary } from '@/services/summaryService'
import { useState } from 'react'
import { toast } from '@/shared/components/ui/use-toast'

interface SummaryOverviewProps {
  projectId: string
}

export function SummaryOverview({ projectId }: SummaryOverviewProps) {
  const { summary, isLoading, refreshSummary } = useProjectSummary(projectId)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await refreshProjectSummary(projectId)
      await refreshSummary()
      toast({
        title: "Summary refreshed",
        description: "The project summary data has been updated",
        variant: "default"
      })
    } catch (error) {
      console.error("Failed to refresh summary:", error)
      toast({
        title: "Refresh failed",
        description: "There was a problem updating the summary data",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading) {
    return <SummaryOverviewSkeleton />
  }

  const isOverBudget = summary ? (summary.paid_bills_total + summary.unpaid_bills_total) > summary.estimate_total : false
  const differenceIcon = isOverBudget ? 
    <ArrowUp className="h-3 w-3 text-red-600" /> : 
    <ArrowDown className="h-3 w-3 text-blue-600" />

  return (
    <div className="mb-3">
      {/* Ultra-compact horizontal summary bar */}
      <div className="flex items-center justify-between py-2 px-3 bg-slate-50/50 border border-slate-200/50 rounded-lg">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-600 font-medium">Budget:</span>{' '}
            <span className="font-semibold text-slate-900">
              {summary ? formatCurrency(summary.estimate_total) : '$0.00'}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-300" />
          <div>
            <span className="text-slate-600 font-medium">Bills:</span>{' '}
            <span className="font-semibold text-slate-900">
              {summary ? formatCurrency(summary.paid_bills_total + summary.unpaid_bills_total) : '$0.00'}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-300" />
          <div className="flex items-center gap-1">
            {differenceIcon}
            <span className="text-slate-600 font-medium">{isOverBudget ? 'Over:' : 'Under:'}</span>{' '}
            <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
              {summary ? formatCurrency(Math.abs(summary.bills_difference)) : '$0.00'}
            </span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 hover:bg-slate-200/50"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
        </Button>
      </div>
    </div>
  )
}

function SummaryOverviewSkeleton() {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between py-2 px-3 bg-slate-50/50 border border-slate-200/50 rounded-lg">
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-[100px]" />
          <div className="h-3 w-px bg-slate-300" />
          <Skeleton className="h-4 w-[80px]" />
          <div className="h-3 w-px bg-slate-300" />
          <Skeleton className="h-4 w-[90px]" />
        </div>
        <Skeleton className="h-7 w-7 rounded" />
      </div>
    </div>
  )
} 