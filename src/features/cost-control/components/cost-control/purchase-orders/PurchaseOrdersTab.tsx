'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Database } from '@/shared/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface PurchaseOrdersTabProps {
  project: Project
}

export function PurchaseOrdersTab({ project }: PurchaseOrdersTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Purchase orders management functionality coming soon...
            </p>
            <Button variant="outline" disabled>
              Create Purchase Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}