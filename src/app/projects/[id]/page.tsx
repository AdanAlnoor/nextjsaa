'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  useEffect(() => {
    // Redirect to the BQ tab by default
    router.replace(`/projects/${id}/bq`)
  }, [router, id])

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading Project...</h1>
        <p>You will be redirected to the BQ section.</p>
      </div>
    </div>
  )
} 