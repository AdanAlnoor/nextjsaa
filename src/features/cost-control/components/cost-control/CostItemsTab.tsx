'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Database } from '@/shared/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface CostItemsTabProps {
  project: Project
}

export function CostItemsTab({ project }: CostItemsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cost Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Cost items management functionality coming soon...
            </p>
            <Button variant="outline" disabled>
              Add Cost Item
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}