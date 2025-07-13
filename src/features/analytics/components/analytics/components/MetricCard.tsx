'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import type { MetricCardProps } from '@/shared/types/phase3'

export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  format = 'number',
  loading = false,
  onClick
}: MetricCardProps) {
  const formatValue = (val: number | string, fmt: string) => {
    if (typeof val === 'string') return val
    
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val)
    }
  }

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4" />
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />
      case 'neutral':
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-red-600'
      case 'decrease':
        return 'text-green-600'
      case 'neutral':
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        "transition-colors duration-200",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {change !== undefined && (
          <div className={cn("flex items-center text-sm", getChangeColor())}>
            {getChangeIcon()}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value, format)}
        </div>
        {change !== undefined && (
          <div className={cn("text-xs flex items-center mt-1", getChangeColor())}>
            <span className="mr-1">
              {changeType === 'increase' ? '+' : changeType === 'decrease' ? '-' : ''}
              {formatValue(Math.abs(change), format === 'currency' ? 'number' : format)}
            </span>
            <span className="text-muted-foreground">
              from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
