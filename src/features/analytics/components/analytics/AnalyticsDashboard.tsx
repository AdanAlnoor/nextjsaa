'use client'

import { useState, useMemo } from 'react'
import { Calendar, TrendingUp, AlertTriangle, DollarSign, Activity, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
// import { useAnalyticsData } from './hooks/useAnalyticsData'
import { MetricCard } from './components/MetricCard'
// import { BudgetUtilizationChart } from './components/BudgetUtilizationChart'
// import { VarianceAnalysisChart } from './components/VarianceAnalysisChart'
// import { ProjectHealthScorecard } from './components/ProjectHealthScorecard'
// import { CostTrendChart } from './components/CostTrendChart'
// import { FilterPanel } from './components/FilterPanel'
import type { AnalyticsDashboardProps, AnalyticsFilter } from '@/shared/types/phase3'

export function AnalyticsDashboard({ 
  projectId, 
  dateRange 
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<AnalyticsFilter>({
    dateRange: dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    projects: projectId ? [projectId] : [],
    costItems: [],
    categories: []
  })

  // Temporary mock data while we resolve Select issues
  const budgetUtilization: any[] = []
  const variances: any[] = []
  const forecasts: any[] = []
  const healthMetrics: any[] = []
  const trends: any[] = []
  const isLoading = false
  const error = null
  const refetch = () => Promise.resolve()

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!budgetUtilization.length) {
      return {
        totalBudget: 0,
        totalSpent: 0,
        totalCommitted: 0,
        utilizationRate: 0,
        avgVariance: 0,
        projectsAtRisk: 0
      }
    }

    const totalBudget = budgetUtilization.reduce((sum, item) => sum + item.total_budget, 0)
    const totalSpent = budgetUtilization.reduce((sum, item) => sum + item.spent_amount, 0)
    const totalCommitted = budgetUtilization.reduce((sum, item) => sum + item.committed_amount, 0)
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const avgVariance = variances.length > 0 
      ? variances.reduce((sum, v) => sum + Math.abs(v.variance_percentage), 0) / variances.length 
      : 0
    const projectsAtRisk = budgetUtilization.filter(item => 
      item.risk_level === 'HIGH' || item.risk_level === 'CRITICAL'
    ).length

    return {
      totalBudget,
      totalSpent,
      totalCommitted,
      utilizationRate,
      avgVariance,
      projectsAtRisk
    }
  }, [budgetUtilization, variances])

  // Get current health status
  const currentHealth = useMemo(() => {
    if (!healthMetrics.length) return null
    return healthMetrics[0] // Most recent health metric
  }, [healthMetrics])

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics data. Please try refreshing the page.
            <Button variant="outline" size="sm" className="ml-2" onClick={refetch}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive budget analysis and performance insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            {isLoading ? (
              <Activity className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Panel - Temporarily disabled */}
      {/* {false && showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )} */}

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Budget"
          value={summaryMetrics.totalBudget}
          format="currency"
          loading={isLoading}
        />
        <MetricCard
          title="Total Spent"
          value={summaryMetrics.totalSpent}
          format="currency"
          change={summaryMetrics.utilizationRate}
          changeType={summaryMetrics.utilizationRate > 90 ? 'increase' : 'neutral'}
          loading={isLoading}
        />
        <MetricCard
          title="Utilization Rate"
          value={summaryMetrics.utilizationRate}
          format="percentage"
          change={summaryMetrics.avgVariance}
          changeType={summaryMetrics.avgVariance > 10 ? 'increase' : 'neutral'}
          loading={isLoading}
        />
        <MetricCard
          title="Projects at Risk"
          value={summaryMetrics.projectsAtRisk}
          format="number"
          loading={isLoading}
        />
      </div>

      {/* Project Health Alert */}
      {currentHealth && currentHealth.risk_level !== 'LOW' && (
        <Alert variant={currentHealth.risk_level === 'CRITICAL' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Project health score is {currentHealth.overall_health_score.toFixed(1)}/10 
            ({currentHealth.risk_level}). 
            {currentHealth.recommendations?.length > 0 && (
              <span className="ml-1">
                {currentHealth.recommendations[0]}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="utilization">Budget Utilization</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          <TabsTrigger value="trends">Cost Trends</TabsTrigger>
          <TabsTrigger value="health">Project Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Budget Utilization Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Budget Utilization
                </CardTitle>
                <CardDescription>
                  Current budget usage across all projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center border rounded-lg bg-gray-50">
                    <p className="text-muted-foreground">Budget utilization chart placeholder</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Variances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recent Variances
                </CardTitle>
                <CardDescription>
                  Latest budget variance alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : variances.length > 0 ? (
                  <div className="space-y-2">
                    {variances.slice(0, 5).map((variance) => (
                      <div key={variance.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={variance.variance_type === 'OVER_BUDGET' ? 'destructive' : 'secondary'}
                          >
                            {variance.variance_percentage.toFixed(1)}%
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            Cost Item {variance.cost_control_item_id.slice(-8)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(variance.variance_period_end).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent variances to display
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Health Summary */}
          {currentHealth && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Project Health Summary
                </CardTitle>
                <CardDescription>
                  Overall project performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-center justify-center border rounded-lg bg-gray-50">
                  <p className="text-muted-foreground">Project health scorecard placeholder</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="utilization">
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization Analysis</CardTitle>
              <CardDescription>
                Detailed view of budget usage patterns and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <div className="h-96 flex items-center justify-center border rounded-lg bg-gray-50">
                  <p className="text-muted-foreground">Budget utilization analysis placeholder</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variance">
          <Card>
            <CardHeader>
              <CardTitle>Variance Analysis</CardTitle>
              <CardDescription>
                Budget variance trends and analysis over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <div className="h-96 flex items-center justify-center border rounded-lg bg-gray-50">
                  <p className="text-muted-foreground">Variance analysis chart placeholder</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Cost Trend Analysis</CardTitle>
              <CardDescription>
                Historical cost patterns and future projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <div className="h-96 flex items-center justify-center border rounded-lg bg-gray-50">
                  <p className="text-muted-foreground">Cost trend analysis chart placeholder</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Project Health Dashboard</CardTitle>
              <CardDescription>
                Comprehensive project health metrics and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : currentHealth ? (
                <div className="h-96 flex items-center justify-center border rounded-lg bg-gray-50">
                  <p className="text-muted-foreground">Project health scorecard placeholder</p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No health metrics available. 
                  <Button variant="link" className="ml-1" onClick={refetch}>
                    Calculate health score
                  </Button>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
