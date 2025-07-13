'use client'

import { Button } from '@/shared/components/ui/button'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { importEstimateDataToCostControl } from '@/shared/lib/estimateImport'

interface ImportToCostControlButtonProps {
  projectId: string
}

export function ImportToCostControlButton({ projectId }: ImportToCostControlButtonProps) {
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async () => {
    if (isImporting) return
    
    try {
      setIsImporting(true)
      const result = await importEstimateDataToCostControl(projectId, true)
      
      if (result.success) {
        toast.success('Data imported to Cost Control successfully')
      } else {
        toast.error('Failed to import data to Cost Control')
        console.error('Import error:', result.error)
      }
    } catch (error) {
      console.error('Error importing data:', error)
      toast.error('An error occurred while importing data')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleImport}
      disabled={isImporting}
      className="border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
    >
      {isImporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500 mr-2"></div>
          Importing...
        </>
      ) : (
        <>
          <Upload className="mr-2 h-4 w-4 text-indigo-500" />
          Add to Cost Control
        </>
      )}
    </Button>
  )
} 