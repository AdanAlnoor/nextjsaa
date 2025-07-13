'use client'

import { useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  componentName?: string
  children?: React.ReactNode
}

export function ErrorBoundary({ error, reset, componentName, children }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(`Error in ${componentName || 'component'}:`, error)
  }, [error, componentName])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Something went wrong{componentName ? ` in ${componentName}` : ''}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.message || 'An unexpected error occurred'}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={reset}
            className="border-red-300 text-red-600 hover:bg-red-100"
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return children
} 