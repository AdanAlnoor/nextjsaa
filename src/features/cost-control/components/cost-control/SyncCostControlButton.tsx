'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { importEstimateDataToCostControl } from '@/shared/lib/estimateImport'
import { ReloadIcon } from '@radix-ui/react-icons'
import { toast } from 'sonner'

interface SyncCostControlButtonProps {
  projectId: string
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  buttonText?: string
  onSuccess?: () => void
  recalculateParents?: boolean
}

export default function SyncCostControlButton({
  projectId,
  variant = 'default',
  size = 'default',
  className = '',
  buttonText = 'Sync with Estimate',
  onSuccess,
  recalculateParents = false
}: SyncCostControlButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSync = async () => {
    try {
      setIsLoading(true)
      
      console.log('Starting sync with estimate for project:', projectId)
      console.log('Recalculate parents option:', recalculateParents)
      
      const result = await importEstimateDataToCostControl(projectId, recalculateParents)
      
      if (result.success) {
        if (result.warning) {
          // Success with warning
          toast.warning(`Sync completed with warnings: ${result.warning}`)
          console.log('Sync completed with warnings:', result.warning)
        } else {
          // Complete success
          toast.success('Cost control synced with estimate successfully')
          console.log('Sync completed successfully')
        }
        
        if (onSuccess) {
          onSuccess()
        }
      } else {
        console.error('Sync failed:', result.error)
        toast.error(`Failed to sync: ${result.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error during sync:', error)
      toast.error(`Error during sync: ${(error as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleSync}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        buttonText
      )}
    </Button>
  )
} 