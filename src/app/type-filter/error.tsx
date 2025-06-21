'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import FilterLayout from '@/components/layouts/FilterLayout'

export default function TypeFilterError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <FilterLayout>
      <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-muted-foreground">Failed to load type filters</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </FilterLayout>
  )
} 