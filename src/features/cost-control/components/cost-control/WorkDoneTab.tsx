'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Database } from '@/shared/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface WorkDoneTabProps {
  project: Project
}

export function WorkDoneTab({ project }: WorkDoneTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Work Done</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Work done tracking functionality coming soon...
            </p>
            <Button variant="outline" disabled>
              Record Work
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}