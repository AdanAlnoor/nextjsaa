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
  Area,
  AreaChart
} from 'recharts'
import type { CostTrendAnalysis, BudgetForecast } from '@/shared/types/phase3'

interface CostTrendChartProps {
  data: CostTrendAnalysis[]
  forecasts?: BudgetForecast[]
  height?: number
  showLegend?: boolean
  interactive?: boolean
  onDataPointClick?: (point: any) => void
}

const TREND_COLORS = {
  INCREASING: '#ef4444',
  DECREASING: '#10b981',
  STABLE: '#6b7280',
  VOLATILE: '#f59e0b'
}

export function CostTrendChart({
  data,
  forecasts = [],
  height = 300,
  showLegend = true,
  interactive = true,
  onDataPointClick
}: CostTrendChartProps) {
  const chartData = useMemo(() => {
    // Combine historical data and forecasts
    const historical = data.map(trend => ({
      date: new Date(trend.analysis_period_end).toLocaleDateString(),
      actualSpend: trend.average_monthly_spend,
      projectedCost: trend.projected_completion_cost,
      trendDirection: trend.trend_direction,
      trendStrength: trend.trend_strength,
      type: 'historical'
    }))

    const forecastData = forecasts.map(forecast => ({
      date: new Date(forecast.forecast_date).toLocaleDateString(),
      forecastSpend: forecast.forecasted_spending,
      confidence: forecast.confidence_level,
      type: 'forecast'
    }))

    // Merge and sort by date
    return [...historical, ...forecastData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data, forecasts])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            {data.actualSpend && (
              <p className="text-blue-600">
                Actual Spend: {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(data.actualSpend)}
              </p>
            )}
            {data.forecastSpend && (
              <p className="text-green-600">
                Forecast: {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(data.forecastSpend)}
              </p>
            )}
            {data.projectedCost && (
              <p className="text-orange-600">
                Projected Total: {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(data.projectedCost)}
              </p>
            )}
            {data.trendDirection && (
              <p className={`font-medium ${
                data.trendDirection === 'INCREASING' ? 'text-red-600' :
                data.trendDirection === 'DECREASING' ? 'text-green-600' :
                data.trendDirection === 'STABLE' ? 'text-blue-600' :
                'text-yellow-600'
              }`}>
                Trend: {data.trendDirection} ({(data.trendStrength * 100).toFixed(1)}%)
              </p>
            )}
            {data.confidence && (
              <p className="text-gray-600">
                Confidence: {(data.confidence * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No cost trend data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
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
          tickFormatter={(value) => 
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact'
            }).format(value)
          }
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        )}
        
        {/* Historical actual spending area */}
        <Area
          type="monotone"
          dataKey="actualSpend"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.3}
          name="Actual Spending"
        />
        
        {/* Forecast area */}
        <Area
          type="monotone"
          dataKey="forecastSpend"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.2}
          strokeDasharray="5 5"
          name="Forecast"
        />
        
        {/* Projected completion cost line */}
        <Line
          type="monotone"
          dataKey="projectedCost"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name="Projected Total Cost"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Trend direction indicator component
export function TrendIndicator({ 
  direction, 
  strength 
}: { 
  direction: string
  strength: number 
}) {
  const color = TREND_COLORS[direction as keyof typeof TREND_COLORS] || '#6b7280'
  
  return (
    <div className="flex items-center space-x-2">
      <div 
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-medium" style={{ color }}>
        {direction}
      </span>
      <span className="text-xs text-muted-foreground">
        ({(strength * 100).toFixed(1)}%)
      </span>
    </div>
  )
}
