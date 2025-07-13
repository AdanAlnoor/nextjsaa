// Analytics Dashboard component
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { BarChart, TrendingUp, DollarSign, Users, Activity } from 'lucide-react'

interface AnalyticsMetric {
  id: string
  title: string
  value: string | number
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
}

const sampleMetrics: AnalyticsMetric[] = [
  {
    id: 'total-projects',
    title: 'Total Projects',
    value: 24,
    change: '+12%',
    changeType: 'positive',
    icon: <Activity className="h-4 w-4" />
  },
  {
    id: 'active-users',
    title: 'Active Users',
    value: 156,
    change: '+8%',
    changeType: 'positive',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'total-revenue',
    title: 'Total Revenue',
    value: '$2,450,000',
    change: '+15%',
    changeType: 'positive',
    icon: <DollarSign className="h-4 w-4" />
  },
  {
    id: 'project-completion',
    title: 'Completion Rate',
    value: '87%',
    change: '+3%',
    changeType: 'positive',
    icon: <TrendingUp className="h-4 w-4" />
  }
]

interface AnalyticsDashboardProps {
  className?: string
  showHeader?: boolean
}

export function AnalyticsDashboard({ className, showHeader = true }: AnalyticsDashboardProps) {
  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your construction projects and business metrics
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sampleMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className={`text-xs ${
                metric.changeType === 'positive' 
                  ? 'text-green-600' 
                  : metric.changeType === 'negative' 
                  ? 'text-red-600' 
                  : 'text-muted-foreground'
              }`}>
                {metric.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <BarChart className="h-12 w-12 mx-auto mb-4" />
                <p>Chart visualization would go here</p>
                <p className="text-sm">Integrate with your preferred charting library</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'New project created', time: '2 hours ago', project: 'Office Building A' },
                { action: 'Estimate completed', time: '4 hours ago', project: 'Residential Complex' },
                { action: 'Team member added', time: '1 day ago', project: 'Shopping Mall' },
                { action: 'Bill approved', time: '2 days ago', project: 'Highway Bridge' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.project}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{activity.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnalyticsDashboard