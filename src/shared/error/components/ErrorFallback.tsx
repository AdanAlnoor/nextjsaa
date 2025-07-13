'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && process.env.NODE_ENV === 'development' && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-mono text-muted-foreground">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            {resetError && (
              <Button onClick={resetError} className="flex-1">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}