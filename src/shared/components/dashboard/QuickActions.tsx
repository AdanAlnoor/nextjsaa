// Quick actions component for dashboard
import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Plus, FileText, Users, Settings, BarChart } from 'lucide-react'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

const quickActions: QuickAction[] = [
  {
    id: 'new-project',
    title: 'New Project',
    description: 'Create a new construction project',
    icon: <Plus className="h-5 w-5" />,
    href: '/projects/new',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: 'new-estimate',
    title: 'New Estimate',
    description: 'Create a bill of quantities',
    icon: <FileText className="h-5 w-5" />,
    href: '/estimates/new',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'manage-team',
    title: 'Manage Team',
    description: 'Add or manage team members',
    icon: <Users className="h-5 w-5" />,
    href: '/admin/users',
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    id: 'analytics',
    title: 'View Analytics',
    description: 'Check project performance',
    icon: <BarChart className="h-5 w-5" />,
    href: '/analytics',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure application settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
    color: 'bg-gray-500 hover:bg-gray-600'
  }
]

interface QuickActionsProps {
  className?: string
  maxActions?: number
}

export function QuickActions({ className, maxActions = 5 }: QuickActionsProps) {
  const displayActions = quickActions.slice(0, maxActions)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Quickly access common tasks and features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className={`h-auto p-4 flex flex-col items-center gap-2 ${action.color} text-white border-none hover:scale-105 transition-all duration-200`}
              asChild
            >
              <a href={action.href}>
                {action.icon}
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
                </div>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default QuickActions