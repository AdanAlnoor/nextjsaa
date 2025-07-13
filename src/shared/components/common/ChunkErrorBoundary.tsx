'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface ChunkErrorBoundaryProps {
  children: React.ReactNode
}

export function ChunkErrorBoundary({ children }: ChunkErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string>('')

  useEffect(() => {
    // Function to handle chunk load errors
    const handleChunkError = (event: ErrorEvent) => {
      // Check if this is a chunk load error or webpack-related error
      if (
        event.error &&
        (event.error.message?.includes('ChunkLoadError') ||
          event.error.message?.includes('Loading chunk') ||
          event.error.message?.includes('Failed to fetch dynamically imported module') ||
          event.error.message?.includes('undefined is not an object') ||
          event.error.message?.includes('originalFactory.call') ||
          event.error.stack?.includes('webpack.js') ||
          event.error.stack?.includes('__webpack_require__'))
      ) {
        console.error('Webpack or chunk load error detected:', event.error)
        setHasError(true)
        setErrorDetails(event.error.message || 'Error loading page content')
        
        // Prevent the error from propagating
        event.preventDefault()
      }
    }

    // Function to handle promise rejection errors (including fetch errors)
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason &&
        (event.reason.message?.includes('ChunkLoadError') ||
          event.reason.message?.includes('Loading chunk') ||
          event.reason.message?.includes('Failed to fetch dynamically imported module') ||
          event.reason.message?.includes('undefined is not an object') ||
          event.reason.message?.includes('originalFactory.call') ||
          event.reason.stack?.includes('webpack.js') ||
          event.reason.stack?.includes('__webpack_require__'))
      ) {
        console.error('Unhandled webpack or chunk load rejection:', event.reason)
        setHasError(true)
        setErrorDetails(event.reason.message || 'Error loading page content')
        
        // Prevent the rejection from propagating
        event.preventDefault()
      }
    }

    // Add event listeners
    window.addEventListener('error', handleChunkError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleChunkError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  const handleRefresh = () => {
    // Clear application cache
    if ('caches' in window) {
      caches.keys().then((names) => {
        // Delete all cache entries
        names.forEach((name) => {
          caches.delete(name)
        })
      })
    }
    
    // Clear local storage cache entries related to Next.js
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('next-') || key.includes('chunk')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear session storage as well
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('next-') || key.includes('chunk') || key.includes('webpack')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Force a hard reload with cache busting
    window.location.href = window.location.pathname + '?reload=' + Date.now();
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-3">
            Failed to load page content
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            There was an error loading required modules. This might be due to a network issue or a cached module conflict.
          </p>
          {errorDetails && (
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded text-sm text-red-800 dark:text-red-300 mb-4 overflow-auto max-h-[100px] text-left">
              {errorDetails}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleRefresh}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh &amp; Clear Cache
            </Button>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will clear the application cache and reload the page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 