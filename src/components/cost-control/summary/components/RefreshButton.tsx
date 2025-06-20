'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { refreshProjectSummary } from '@/services/summaryService'
import { toast } from '@/components/ui/use-toast'

interface RefreshButtonProps {
  projectId: string
  onSuccess?: () => void
}

export function RefreshButton({ projectId, onSuccess }: RefreshButtonProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      // Refresh the summary table in the database
      await refreshProjectSummary(projectId)
      
      // Call the onSuccess callback to refresh any dependent components
      if (onSuccess) {
        onSuccess()
      }
      
      toast({
        title: "Data Refreshed",
        description: "The project summary and detail data has been updated.",
        duration: 3000
      })
    } catch (error) {
      console.error("Failed to refresh data:", error)
      toast({
        title: "Refresh Failed",
        description: "There was a problem updating the data. Please try again.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-1"
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
      <span>Refresh Data</span>
    </Button>
  )
} 