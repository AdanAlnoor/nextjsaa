'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent } from '@/shared/components/ui/card'
import type { BudgetUtilizationData, ChartProps } from '@/shared/types/phase3'

interface BudgetUtilizationChartProps extends Omit<ChartProps, 'data'> {
  data: BudgetUtilizationData[]
}

const RISK_COLORS = {
  LOW: '#10b981', // green
  MEDIUM: '#f59e0b', // yellow
  HIGH: '#ef4444', // red
  CRITICAL: '#dc2626' // dark red
}

export function BudgetUtilizationChart({
  data,
  height = 300,
  showLegend = true,
  interactive = true,
  onDataPointClick
}: BudgetUtilizationChartProps) {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: `Project ${index + 1}`,
      projectId: item.project_id,
      totalBudget: item.total_budget,
      spentAmount: item.spent_amount,
      committedAmount: item.committed_amount,
      availableBudget: item.available_budget,
      utilizationPercentage: item.utilization_percentage,
      riskLevel: item.risk_level,
      variance: item.variance_from_plan
    }))
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              Total Budget: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(data.totalBudget)}
            </p>
            <p className="text-green-600">
              Spent: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(data.spentAmount)}
            </p>
            <p className="text-yellow-600">
              Committed: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(data.committedAmount)}
            </p>
            <p className="text-gray-600">
              Available: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(data.availableBudget)}
            </p>
            <p className="font-medium">
              Utilization: {data.utilizationPercentage.toFixed(1)}%
            </p>
            <p className={`font-medium ${
              data.riskLevel === 'LOW' ? 'text-green-600' :
              data.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
              data.riskLevel === 'HIGH' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              Risk Level: {data.riskLevel}
            </p>
            {data.variance !== 0 && (
              <p className={`text-sm ${
                data.variance > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                Variance: {data.variance > 0 ? '+' : ''}{data.variance.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  const handleBarClick = (data: any) => {
    if (interactive && onDataPointClick) {
      onDataPointClick({
        date: new Date().toISOString(),
        value: data.utilizationPercentage,
        label: data.name,
        metadata: data
      })
    }
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No budget utilization data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
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
          dataKey="name" 
          tick={{ fontSize: 12 }}
          interval={0}
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
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
        )}
        
        {/* Stacked bars for budget breakdown */}
        <Bar 
          dataKey="spentAmount" 
          name="Spent"
          fill="#ef4444"
          onClick={handleBarClick}
          className={interactive ? "cursor-pointer" : ""}
        />
        <Bar 
          dataKey="committedAmount" 
          name="Committed"
          fill="#f59e0b"
          onClick={handleBarClick}
          className={interactive ? "cursor-pointer" : ""}
        />
        <Bar 
          dataKey="availableBudget" 
          name="Available"
          fill="#10b981"
          onClick={handleBarClick}
          className={interactive ? "cursor-pointer" : ""}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Alternative utilization percentage chart
export function UtilizationPercentageChart({
  data,
  height = 300,
  showLegend = true,
  interactive = true,
  onDataPointClick
}: BudgetUtilizationChartProps) {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      name: `Project ${index + 1}`,
      projectId: item.project_id,
      utilization: item.utilization_percentage,
      riskLevel: item.risk_level,
      target: 85 // Target utilization percentage
    }))
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">
            Utilization: {data.utilization.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600">
            Target: {data.target}%
          </p>
          <p className={`text-sm font-medium ${
            data.riskLevel === 'LOW' ? 'text-green-600' :
            data.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
            data.riskLevel === 'HIGH' ? 'text-orange-600' :
            'text-red-600'
          }`}>
            Risk: {data.riskLevel}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
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
          dataKey="name" 
          tick={{ fontSize: 12 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        )}
        
        <Bar dataKey="utilization" name="Utilization %">
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={RISK_COLORS[entry.riskLevel as keyof typeof RISK_COLORS]}
              className={interactive ? "cursor-pointer" : ""}
              onClick={() => {
                if (interactive && onDataPointClick) {
                  onDataPointClick({
                    date: new Date().toISOString(),
                    value: entry.utilization,
                    label: entry.name,
                    metadata: entry
                  })
                }
              }}
            />
          ))}
        </Bar>
        
        {/* Target line */}
        <Bar 
          dataKey="target" 
          name="Target" 
          fill="transparent" 
          stroke="#6b7280"
          strokeWidth={2}
          strokeDasharray="5 5"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
