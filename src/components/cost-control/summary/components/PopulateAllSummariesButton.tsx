'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'
import { populateAllProjectSummaries } from '@/services/summaryService'
import { toast } from '@/components/ui/use-toast'

export function PopulateAllSummariesButton() {
  const [processing, setProcessing] = useState(false)

  const handlePopulate = async () => {
    try {
      setProcessing(true)
      
      // Show confirmation dialog before proceeding
      const confirm = window.confirm(
        'This will refresh summary data for ALL projects in the database.\n\n' +
        'This operation should only be performed when setting up the system ' +
        'for the first time or when fixing data issues.\n\n' +
        'Do you want to continue?'
      )
      
      if (!confirm) {
        setProcessing(false)
        return
      }
      
      // Populate all project summaries
      const result = await populateAllProjectSummaries()
      
      toast({
        title: "Success",
        description: result || "All project summaries have been refreshed",
        duration: 5000
      })
    } catch (error) {
      console.error("Failed to populate summaries:", error)
      toast({
        title: "Operation Failed",
        description: "There was a problem refreshing project summaries. Check console for details.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-1"
      onClick={handlePopulate}
      disabled={processing}
    >
      <Database size={14} className={processing ? "animate-pulse" : ""} />
      <span>Populate All Summaries</span>
    </Button>
  )
} 