'use client'

import { useMemo } from 'react'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { ProjectHealthMetrics } from '@/shared/types/phase3'

interface ProjectHealthScorecardProps {
  healthMetrics: ProjectHealthMetrics
  showDetails?: boolean
  historicalData?: ProjectHealthMetrics[]
  className?: string
}

const RISK_COLORS = {
  LOW: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
}

const SCORE_COLORS = {
  excellent: 'text-green-600',
  good: 'text-blue-600',
  fair: 'text-yellow-600',
  poor: 'text-red-600'
}

function getScoreCategory(score: number): keyof typeof SCORE_COLORS {
  if (score >= 8) return 'excellent'
  if (score >= 6) return 'good'
  if (score >= 4) return 'fair'
  return 'poor'
}

function getScoreIcon(score: number) {
  if (score >= 8) return <CheckCircle className="h-5 w-5 text-green-600" />
  if (score >= 6) return <TrendingUp className="h-5 w-5 text-blue-600" />
  if (score >= 4) return <Clock className="h-5 w-5 text-yellow-600" />
  return <AlertTriangle className="h-5 w-5 text-red-600" />
}

export function ProjectHealthScorecard({
  healthMetrics,
  showDetails = true,
  historicalData = [],
  className = ''
}: ProjectHealthScorecardProps) {
  const riskStyle = RISK_COLORS[healthMetrics.risk_level]
  
  const trendData = useMemo(() => {
    if (!historicalData.length) return []
    
    return historicalData
      .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime())
      .slice(-30) // Last 30 data points
      .map(metric => ({
        date: new Date(metric.metric_date).toLocaleDateString(),
        overall: metric.overall_health_score,
        budget: metric.budget_health_score,
        schedule: metric.schedule_health_score,
        quality: metric.quality_health_score
      }))
  }, [historicalData])

  const healthScores = [
    {
      label: 'Budget Health',
      score: healthMetrics.budget_health_score,
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Budget utilization and variance'
    },
    {
      label: 'Schedule Health',
      score: healthMetrics.schedule_health_score,
      icon: <Clock className="h-4 w-4" />,
      description: 'Timeline adherence and milestones'
    },
    {
      label: 'Quality Health',
      score: healthMetrics.quality_health_score,
      icon: <Target className="h-4 w-4" />,
      description: 'Deliverable quality and standards'
    }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Health Score */}
      <Card className={`${riskStyle.border} border-2`}>
        <CardHeader className={`${riskStyle.bg} border-b ${riskStyle.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6" />
              <div>
                <CardTitle className="text-lg">Overall Project Health</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(healthMetrics.metric_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Badge 
              variant={healthMetrics.risk_level === 'LOW' ? 'secondary' : 'destructive'}
              className={`${riskStyle.text} ${riskStyle.bg}`}
            >
              {healthMetrics.risk_level} RISK
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getScoreIcon(healthMetrics.overall_health_score)}
              <span className={`text-3xl font-bold ${
                SCORE_COLORS[getScoreCategory(healthMetrics.overall_health_score)]
              }`}>
                {healthMetrics.overall_health_score.toFixed(1)}
              </span>
              <span className="text-muted-foreground">/10</span>
            </div>
            <div className="flex-1">
              <Progress 
                value={healthMetrics.overall_health_score * 10} 
                className="h-3"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {getScoreCategory(healthMetrics.overall_health_score).toUpperCase()} health status
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Health Scores */}
      <div className="grid gap-4 md:grid-cols-3">
        {healthScores.map((item, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className={`text-xl font-bold ${
                  SCORE_COLORS[getScoreCategory(item.score)]
                }`}>
                  {item.score.toFixed(1)}
                </span>
              </div>
              <Progress value={item.score * 10} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showDetails && (
        <>
          {/* Health Trend Chart */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Health Trend (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        fontSize: '12px',
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="overall" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Overall"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#10b981" 
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      name="Budget"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="schedule" 
                      stroke="#f59e0b" 
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      name="Schedule"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="quality" 
                      stroke="#8b5cf6" 
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      name="Quality"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Key Issues and Recommendations */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Key Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Key Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthMetrics.key_issues && healthMetrics.key_issues.length > 0 ? (
                  <div className="space-y-2">
                    {healthMetrics.key_issues.slice(0, 5).map((issue: any, index: number) => (
                      <div key={index} className="flex items-start space-x-2 p-2 rounded-lg bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-800">
                            {issue.title || issue.description || `Issue ${index + 1}`}
                          </p>
                          {issue.severity && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {issue.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No critical issues identified</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-blue-600">
                  <Target className="h-5 w-5 mr-2" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthMetrics.recommendations && healthMetrics.recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {healthMetrics.recommendations.slice(0, 5).map((rec: any, index: number) => (
                      <div key={index} className="flex items-start space-x-2 p-2 rounded-lg bg-blue-50">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-blue-800">
                            {rec.title || rec.description || `Recommendation ${index + 1}`}
                          </p>
                          {rec.priority && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {rec.priority} Priority
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>Project is performing well</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for dashboard widgets
export function ProjectHealthWidget({ 
  healthMetrics,
  onClick 
}: { 
  healthMetrics: ProjectHealthMetrics
  onClick?: () => void 
}) {
  const riskStyle = RISK_COLORS[healthMetrics.risk_level]
  
  return (
    <Card 
      className={`${riskStyle.border} border-l-4 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getScoreIcon(healthMetrics.overall_health_score)}
            <div>
              <p className="font-medium">Project Health</p>
              <p className="text-sm text-muted-foreground">
                {new Date(healthMetrics.metric_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${
              SCORE_COLORS[getScoreCategory(healthMetrics.overall_health_score)]
            }`}>
              {healthMetrics.overall_health_score.toFixed(1)}
            </p>
            <Badge 
              variant={healthMetrics.risk_level === 'LOW' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {healthMetrics.risk_level}
            </Badge>
          </div>
        </div>
        <Progress 
          value={healthMetrics.overall_health_score * 10} 
          className="h-2 mt-3"
        />
      </CardContent>
    </Card>
  )
}
