'use client'

import { useState } from 'react'
import { ErrorBoundary } from './error-boundary'

interface ClientErrorBoundaryProps {
  componentName?: string
  children: React.ReactNode
}

export function ClientErrorBoundary({ componentName, children }: ClientErrorBoundaryProps) {
  const [key, setKey] = useState(0)
  
  return (
    <ErrorBoundary 
      error={new Error()} 
      reset={() => setKey(prev => prev + 1)}
      componentName={componentName}
    >
      {children}
    </ErrorBoundary>
  )
} 