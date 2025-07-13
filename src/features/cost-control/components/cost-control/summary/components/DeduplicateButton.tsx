'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Trash2 } from 'lucide-react'
import { runDeduplication } from '@/services/mcpDeduplicationService'

interface DeduplicateButtonProps {
  projectId: string
  onSuccess?: () => void
}

export function DeduplicateButton({ projectId, onSuccess }: DeduplicateButtonProps) {
  const [isDeduplicating, setIsDeduplicating] = useState(false)

  const handleClick = async () => {
    setIsDeduplicating(true)
    try {
      runDeduplication(projectId, onSuccess)
    } finally {
      setIsDeduplicating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-1"
      onClick={handleClick}
      disabled={isDeduplicating}
    >
      <Trash2 size={14} className={isDeduplicating ? "animate-spin" : ""} />
      <span>Remove Duplicates</span>
    </Button>
  )
} 