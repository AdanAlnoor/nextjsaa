'use client'

import { useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter
} from 'recharts'
import { Badge } from '@/shared/components/ui/badge'
import type { BudgetVariance, ChartProps } from '@/shared/types/phase3'

interface VarianceAnalysisChartProps extends Omit<ChartProps, 'data'> {
  data: BudgetVariance[]
  showThresholds?: boolean
  thresholds?: {
    warning: number
    critical: number
  }
}

const VARIANCE_COLORS = {
  OVER_BUDGET: '#ef4444',
  UNDER_BUDGET: '#10b981',
  ON_BUDGET: '#6b7280'
}

export function VarianceAnalysisChart({
  data,
  height = 300,
  showLegend = true,
  interactive = true,
  onDataPointClick,
  showThresholds = true,
  thresholds = { warning: 10, critical: 25 }
}: VarianceAnalysisChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => new Date(a.variance_period_end).getTime() - new Date(b.variance_period_end).getTime())
      .map((variance) => ({
        date: new Date(variance.variance_period_end).toLocaleDateString(),
        variance: variance.variance_percentage,
        varianceAmount: variance.variance_amount,
        plannedAmount: variance.planned_amount,
        actualAmount: variance.actual_amount,
        varianceType: variance.variance_type,
        itemId: variance.cost_control_item_id,
        period: `${new Date(variance.variance_period_start).toLocaleDateString()} - ${new Date(variance.variance_period_end).toLocaleDateString()}`
      }))
  }, [data])

  const aggregatedData = useMemo(() => {
    // Group by date and calculate average variance
    const grouped = chartData.reduce((acc, item) => {
      const existing = acc.find(d => d.date === item.date)
      if (existing) {
        existing.variances.push(item.variance)
        existing.items.push(item)
      } else {
        acc.push({
          date: item.date,
          variances: [item.variance],
          items: [item]
        })
      }
      return acc
    }, [] as any[])

    return grouped.map(group => ({
      date: group.date,
      avgVariance: group.variances.reduce((sum: number, v: number) => sum + v, 0) / group.variances.length,
      maxVariance: Math.max(...group.variances),
      minVariance: Math.min(...group.variances),
      count: group.variances.length,
      overBudgetCount: group.items.filter((item: any) => item.varianceType === 'OVER_BUDGET').length,
      underBudgetCount: group.items.filter((item: any) => item.varianceType === 'UNDER_BUDGET').length,
      onBudgetCount: group.items.filter((item: any) => item.varianceType === 'ON_BUDGET').length
    }))
  }, [chartData])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              Avg Variance: {data.avgVariance?.toFixed(1)}%
            </p>
            <p className="text-green-600">
              Max Variance: {data.maxVariance?.toFixed(1)}%
            </p>
            <p className="text-red-600">
              Min Variance: {data.minVariance?.toFixed(1)}%
            </p>
            <p className="text-gray-600">
              Items: {data.count}
            </p>
            <div className="flex space-x-2 mt-2">
              {data.overBudgetCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Over: {data.overBudgetCount}
                </Badge>
              )}
              {data.underBudgetCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  Under: {data.underBudgetCount}
                </Badge>
              )}
              {data.onBudgetCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  On Track: {data.onBudgetCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const handlePointClick = (data: any) => {
    if (interactive && onDataPointClick) {
      onDataPointClick({
        date: data.date,
        value: data.avgVariance,
        label: 'Variance Analysis',
        metadata: data
      })
    }
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No variance data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Variance Trend Line Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={aggregatedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          )}
          
          {/* Threshold lines */}
          {showThresholds && (
            <>
              <ReferenceLine 
                y={thresholds.warning} 
                stroke="#f59e0b" 
                strokeDasharray="5 5"
                label={{ value: "Warning", position: "topRight" }}
              />
              <ReferenceLine 
                y={thresholds.critical} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                label={{ value: "Critical", position: "topRight" }}
              />
              <ReferenceLine 
                y={-thresholds.warning} 
                stroke="#f59e0b" 
                strokeDasharray="5 5"
              />
              <ReferenceLine 
                y={-thresholds.critical} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
              />
              <ReferenceLine 
                y={0} 
                stroke="#6b7280" 
                strokeDasharray="2 2"
              />
            </>
          )}
          
          <Line 
            type="monotone" 
            dataKey="avgVariance" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ 
              r: 6, 
              onClick: handlePointClick,
              className: interactive ? "cursor-pointer" : ""
            }}
            name="Average Variance %"
          />
          <Line 
            type="monotone" 
            dataKey="maxVariance" 
            stroke="#ef4444" 
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            name="Max Variance %"
          />
          <Line 
            type="monotone" 
            dataKey="minVariance" 
            stroke="#10b981" 
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            name="Min Variance %"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="font-medium text-blue-800">Total Items</div>
          <div className="text-2xl font-bold text-blue-600">{chartData.length}</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="font-medium text-red-800">Over Budget</div>
          <div className="text-2xl font-bold text-red-600">
            {chartData.filter(item => item.varianceType === 'OVER_BUDGET').length}
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="font-medium text-green-800">Under Budget</div>
          <div className="text-2xl font-bold text-green-600">
            {chartData.filter(item => item.varianceType === 'UNDER_BUDGET').length}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="font-medium text-gray-800">On Budget</div>
          <div className="text-2xl font-bold text-gray-600">
            {chartData.filter(item => item.varianceType === 'ON_BUDGET').length}
          </div>
        </div>
      </div>
    </div>
  )
}

// Scatter plot for variance analysis
export function VarianceScatterChart({
  data,
  height = 300,
  showLegend = true,
  interactive = true,
  onDataPointClick
}: VarianceAnalysisChartProps) {
  const scatterData = useMemo(() => {
    return data.map((variance) => ({
      plannedAmount: variance.planned_amount,
      variancePercentage: variance.variance_percentage,
      actualAmount: variance.actual_amount,
      varianceType: variance.variance_type,
      itemId: variance.cost_control_item_id.slice(-8),
      fill: VARIANCE_COLORS[variance.variance_type]
    }))
  }, [data])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">Item: {data.itemId}</p>
          <div className="space-y-1 text-sm">
            <p>Planned: {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(data.plannedAmount)}</p>
            <p>Actual: {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(data.actualAmount)}</p>
            <p>Variance: {data.variancePercentage.toFixed(1)}%</p>
            <Badge 
              variant={data.varianceType === 'OVER_BUDGET' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {data.varianceType.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart
        data={scatterData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          type="number"
          dataKey="plannedAmount"
          name="Planned Amount"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => 
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact'
            }).format(value)
          }
        />
        <YAxis 
          type="number"
          dataKey="variancePercentage"
          name="Variance %"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        )}
        
        <Scatter 
          name="Budget Variances" 
          data={scatterData} 
          onClick={(data) => {
            if (interactive && onDataPointClick) {
              onDataPointClick({
                date: new Date().toISOString(),
                value: data.variancePercentage,
                label: `Item ${data.itemId}`,
                metadata: data
              })
            }
          }}
          className={interactive ? "cursor-pointer" : ""}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
