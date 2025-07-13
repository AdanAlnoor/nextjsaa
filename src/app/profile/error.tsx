'use client'

import { useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import DefaultLayout from '@/shared/components/layouts/DefaultLayout'

export default function ProfileError({
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
    <DefaultLayout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh]">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <p className="text-muted-foreground">Failed to load profile information</p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </DefaultLayout>
  )
} 