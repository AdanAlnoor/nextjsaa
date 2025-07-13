// Phase 3 Analytics Data Hook
// Main hook for fetching and managing analytics data

import { useState, useEffect, useCallback } from 'react'
import { AnalyticsService } from '@/shared/lib/services/analytics.service'
import type {
  UseAnalyticsDataResult,
  BudgetUtilizationData,
  BudgetVariance,
  BudgetForecast,
  ProjectHealthMetrics,
  CostTrendAnalysis,
  AnalyticsFilter
} from '@/shared/types/phase3'

interface UseAnalyticsDataOptions {
  projectId?: string
  projectIds?: string[]
  filters?: AnalyticsFilter
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useAnalyticsData({
  projectId,
  projectIds,
  filters,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}: UseAnalyticsDataOptions = {}): UseAnalyticsDataResult {
  const [budgetUtilization, setBudgetUtilization] = useState<BudgetUtilizationData[]>([])
  const [variances, setVariances] = useState<BudgetVariance[]>([])
  const [forecasts, setForecasts] = useState<BudgetForecast[]>([])
  const [healthMetrics, setHealthMetrics] = useState<ProjectHealthMetrics[]>([])
  const [trends, setTrends] = useState<CostTrendAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!projectId && (!projectIds || projectIds.length === 0)) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const targetProjectIds = projectIds || (projectId ? [projectId] : [])
      
      // Fetch all analytics data in parallel
      const [utilizationData, varianceData, forecastData, healthData, trendData] = await Promise.allSettled([
        AnalyticsService.getBudgetUtilization(targetProjectIds, filters),
        projectId ? AnalyticsService.getBudgetVariances(projectId, filters) : Promise.resolve([]),
        projectId ? AnalyticsService.getBudgetForecasts(projectId, filters) : Promise.resolve([]),
        projectId ? AnalyticsService.getProjectHealthMetrics(projectId, filters) : Promise.resolve([]),
        projectId ? AnalyticsService.getCostTrends(projectId, filters) : Promise.resolve([])
      ])

      // Process results
      if (utilizationData.status === 'fulfilled') {
        setBudgetUtilization(utilizationData.value)
      }

      if (varianceData.status === 'fulfilled') {
        setVariances(varianceData.value)
      }

      if (forecastData.status === 'fulfilled') {
        setForecasts(forecastData.value)
      }

      if (healthData.status === 'fulfilled') {
        setHealthMetrics(healthData.value)
      }

      if (trendData.status === 'fulfilled') {
        setTrends(trendData.value)
      }

      // Check for any errors
      const errors = [
        utilizationData,
        varianceData,
        forecastData,
        healthData,
        trendData
      ].filter(result => result.status === 'rejected')

      if (errors.length > 0) {
        console.warn('Some analytics data failed to load:', errors)
        // Set a warning but don't throw - partial data is better than no data
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics data'))
    } finally {
      setIsLoading(false)
    }
  }, [projectId, projectIds, filters])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return
    }

    const interval = setInterval(() => {
      fetchData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  return {
    budgetUtilization,
    variances,
    forecasts,
    healthMetrics,
    trends,
    isLoading,
    error,
    refetch
  }
}

// Specialized hook for budget variance analysis
export function useBudgetVariance(projectId: string, filters?: AnalyticsFilter) {
  const [variances, setVariances] = useState<BudgetVariance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchVariances = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await AnalyticsService.getBudgetVariances(projectId, filters)
      setVariances(data)
    } catch (err) {
      console.error('Error fetching budget variances:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch budget variances'))
    } finally {
      setIsLoading(false)
    }
  }, [projectId, filters])

  const calculateVariance = useCallback(async (
    costControlItemId: string,
    analysisPeriod: string = '30 days'
  ) => {
    try {
      const result = await AnalyticsService.calculateBudgetVariance(
        costControlItemId,
        analysisPeriod,
        false
      )
      
      // Refresh variances after calculation
      await fetchVariances()
      
      return result
    } catch (err) {
      console.error('Error calculating budget variance:', err)
      throw err
    }
  }, [fetchVariances])

  useEffect(() => {
    fetchVariances()
  }, [fetchVariances])

  return {
    variances,
    isLoading,
    error,
    refetch: fetchVariances,
    calculateVariance
  }
}

// Specialized hook for project health metrics
export function useProjectHealth(projectId: string, filters?: AnalyticsFilter) {
  const [healthMetrics, setHealthMetrics] = useState<ProjectHealthMetrics[]>([])
  const [currentHealth, setCurrentHealth] = useState<ProjectHealthMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchHealthMetrics = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await AnalyticsService.getProjectHealthMetrics(projectId, filters)
      setHealthMetrics(data)
      
      // Set the most recent health metric as current
      if (data.length > 0) {
        setCurrentHealth(data[0])
      }
    } catch (err) {
      console.error('Error fetching project health metrics:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch health metrics'))
    } finally {
      setIsLoading(false)
    }
  }, [projectId, filters])

  const calculateHealthScore = useCallback(async () => {
    if (!projectId) return

    try {
      const result = await AnalyticsService.calculateProjectHealthScore(projectId)
      
      // Refresh health metrics after calculation
      await fetchHealthMetrics()
      
      return result
    } catch (err) {
      console.error('Error calculating project health score:', err)
      throw err
    }
  }, [projectId, fetchHealthMetrics])

  useEffect(() => {
    fetchHealthMetrics()
  }, [fetchHealthMetrics])

  return {
    healthMetrics,
    currentHealth,
    isLoading,
    error,
    refetch: fetchHealthMetrics,
    calculateHealthScore
  }
}

// Specialized hook for cost trend analysis
export function useCostTrends(projectId: string, filters?: AnalyticsFilter) {
  const [trends, setTrends] = useState<CostTrendAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTrends = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await AnalyticsService.getCostTrends(projectId, filters)
      setTrends(data)
    } catch (err) {
      console.error('Error fetching cost trends:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch cost trends'))
    } finally {
      setIsLoading(false)
    }
  }, [projectId, filters])

  const analyzeTrends = useCallback(async (analysisPeriod: string = '6 months') => {
    if (!projectId) return

    try {
      const result = await AnalyticsService.analyzeCostTrends(projectId, analysisPeriod)
      
      // Refresh trends after analysis
      await fetchTrends()
      
      return result
    } catch (err) {
      console.error('Error analyzing cost trends:', err)
      throw err
    }
  }, [projectId, fetchTrends])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  return {
    trends,
    isLoading,
    error,
    refetch: fetchTrends,
    analyzeTrends
  }
}
