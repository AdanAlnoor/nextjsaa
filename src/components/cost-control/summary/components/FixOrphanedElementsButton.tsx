'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { fixOrphanedElements, refreshSummaryAfterFix } from '@/services/updateStructureElementRelations'
import { toast } from '@/components/ui/use-toast'
import { AlertCircle } from 'lucide-react'

interface FixOrphanedElementsButtonProps {
  projectId: string
  orphanedElementsCount: number
  onSuccess: () => void
}

export function FixOrphanedElementsButton({ 
  projectId,
  orphanedElementsCount,
  onSuccess 
}: FixOrphanedElementsButtonProps) {
  const [isFixing, setIsFixing] = useState(false)
  
  const handleFixOrphanedElements = async () => {
    if (!projectId) return
    
    setIsFixing(true)
    
    try {
      // Fix orphaned elements first
      const fixResult = await fixOrphanedElements(projectId)
      
      if (!fixResult.success) {
        toast({
          title: "Error Fixing Elements",
          description: fixResult.message || "Failed to fix orphaned elements",
          variant: "destructive",
        })
        return
      }
      
      // Then refresh the summary data
      const refreshSuccess = await refreshSummaryAfterFix(projectId)
      
      if (!refreshSuccess) {
        toast({
          title: "Warning",
          description: "Fixed orphaned elements but failed to refresh summary data",
          variant: "default",
        })
      }
      
      toast({
        title: "Elements Fixed",
        description: `Successfully fixed ${fixResult.fixedCount} orphaned elements`,
        variant: "default",
      })
      
      // Trigger the parent's onSuccess callback
      onSuccess()
    } catch (error) {
      console.error('Error fixing orphaned elements:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }
  
  if (orphanedElementsCount === 0) {
    return null
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-1"
      onClick={handleFixOrphanedElements}
      disabled={isFixing}
    >
      <AlertCircle size={14} className="text-amber-500" />
      <span>
        {isFixing ? 'Fixing...' : `Fix ${orphanedElementsCount} Orphaned Element${orphanedElementsCount === 1 ? '' : 's'}`}
      </span>
    </Button>
  )
} 