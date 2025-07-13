'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Database } from '@/shared/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface BillsTabProps {
  project: Project
  authStatus?: 'authenticated' | 'unauthenticated' | 'loading'
}

export function BillsTab({ project }: BillsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bills Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Bills management functionality coming soon...
            </p>
            <Button variant="outline" disabled>
              Create Bill
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}