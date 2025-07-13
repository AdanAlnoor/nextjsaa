// Phase 3 Analytics Service
// Handles budget variance analysis, forecasting, and project health scoring

import { createClient } from '@/shared/lib/supabase/client'
import type {
  BudgetVariance,
  BudgetForecast,
  ProjectHealthMetrics,
  CostTrendAnalysis,
  BudgetUtilizationData,
  ExecutiveMetrics,
  AnalyticsFilter
} from '@/shared/types/phase3'

const supabase = createClient()

export class AnalyticsService {
  /**
   * Get budget utilization data for projects
   */
  static async getBudgetUtilization(
    projectIds?: string[],
    filters?: AnalyticsFilter
  ): Promise<BudgetUtilizationData[]> {
    try {
      const { data, error } = await supabase
        .from('budget_utilization_report')
        .select('*')
        .in('project_id', projectIds || [])
        .order('last_updated', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching budget utilization:', error)
      throw error
    }
  }

  /**
   * Calculate budget variance for cost control items
   */
  static async calculateBudgetVariance(
    costControlItemId: string,
    analysisPeriod: string = '30 days',
    dryRun: boolean = false
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('calculate_budget_variance', {
        p_cost_control_item_id: costControlItemId,
        p_analysis_period: analysisPeriod,
        p_dry_run: dryRun
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error calculating budget variance:', error)
      throw error
    }
  }

  /**
   * Get budget variances for a project
   */
  static async getBudgetVariances(
    projectId: string,
    filters?: AnalyticsFilter
  ): Promise<BudgetVariance[]> {
    try {
      let query = supabase
        .from('budget_variances')
        .select(`
          *,
          cost_control_items!inner(
            name,
            description
          )
        `)
        .eq('project_id', projectId)
        .order('variance_period_end', { ascending: false })

      if (filters?.dateRange) {
        query = query
          .gte('variance_period_start', filters.dateRange.start)
          .lte('variance_period_end', filters.dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching budget variances:', error)
      throw error
    }
  }

  /**
   * Generate spending forecast for a project
   */
  static async generateSpendingForecast(
    projectId: string,
    forecastMonths: number = 3
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('generate_spending_forecast', {
        p_project_id: projectId,
        p_forecast_months: forecastMonths
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error generating spending forecast:', error)
      throw error
    }
  }

  /**
   * Get budget forecasts for a project
   */
  static async getBudgetForecasts(
    projectId: string,
    filters?: AnalyticsFilter
  ): Promise<BudgetForecast[]> {
    try {
      let query = supabase
        .from('budget_forecasts')
        .select(`
          *,
          cost_control_items!inner(
            name,
            description
          )
        `)
        .eq('project_id', projectId)
        .order('forecast_date', { ascending: false })

      if (filters?.dateRange) {
        query = query
          .gte('forecast_date', filters.dateRange.start)
          .lte('forecast_date', filters.dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching budget forecasts:', error)
      throw error
    }
  }

  /**
   * Analyze cost trends for a project
   */
  static async analyzeCostTrends(
    projectId: string,
    analysisPeriod: string = '6 months'
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('analyze_cost_trends', {
        p_project_id: projectId,
        p_analysis_period: analysisPeriod
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error analyzing cost trends:', error)
      throw error
    }
  }

  /**
   * Get cost trend analysis data
   */
  static async getCostTrends(
    projectId: string,
    filters?: AnalyticsFilter
  ): Promise<CostTrendAnalysis[]> {
    try {
      let query = supabase
        .from('cost_trend_analysis')
        .select('*')
        .eq('project_id', projectId)
        .order('analysis_period_end', { ascending: false })

      if (filters?.dateRange) {
        query = query
          .gte('analysis_period_start', filters.dateRange.start)
          .lte('analysis_period_end', filters.dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching cost trends:', error)
      throw error
    }
  }

  /**
   * Calculate project health score
   */
  static async calculateProjectHealthScore(
    projectId: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('calculate_project_health_score', {
        p_project_id: projectId
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error calculating project health score:', error)
      throw error
    }
  }

  /**
   * Get project health metrics
   */
  static async getProjectHealthMetrics(
    projectId: string,
    filters?: AnalyticsFilter
  ): Promise<ProjectHealthMetrics[]> {
    try {
      let query = supabase
        .from('project_health_metrics')
        .select('*')
        .eq('project_id', projectId)
        .order('metric_date', { ascending: false })

      if (filters?.dateRange) {
        query = query
          .gte('metric_date', filters.dateRange.start)
          .lte('metric_date', filters.dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching project health metrics:', error)
      throw error
    }
  }

  /**
   * Get executive dashboard metrics
   */
  static async getExecutiveMetrics(
    projectIds?: string[]
  ): Promise<ExecutiveMetrics> {
    try {
      const { data, error } = await supabase
        .from('executive_dashboard_view')
        .select('*')
        .in('project_id', projectIds || [])
        .single()

      if (error) throw error

      // Transform the data into the expected format
      const metrics: ExecutiveMetrics = {
        portfolio_summary: {
          total_projects: data?.total_projects || 0,
          total_budget: data?.total_budget || 0,
          total_spent: data?.total_spent || 0,
          average_utilization: data?.average_utilization || 0,
          projects_at_risk: data?.projects_at_risk || 0
        },
        budget_health: {
          on_budget_projects: data?.on_budget_projects || 0,
          over_budget_projects: data?.over_budget_projects || 0,
          under_budget_projects: data?.under_budget_projects || 0,
          critical_variances: data?.critical_variances || 0
        },
        forecast_summary: {
          projected_completion_cost: data?.projected_completion_cost || 0,
          forecast_accuracy: data?.forecast_accuracy || 0,
          confidence_level: data?.confidence_level || 0,
          next_month_projection: data?.next_month_projection || 0
        },
        workflow_metrics: {
          pending_approvals: data?.pending_approvals || 0,
          escalated_items: data?.escalated_items || 0,
          automated_actions: data?.automated_actions || 0,
          avg_approval_time: data?.avg_approval_time || 0
        }
      }

      return metrics
    } catch (error) {
      console.error('Error fetching executive metrics:', error)
      throw error
    }
  }

  /**
   * Get variance report data
   */
  static async getVarianceReport(
    projectIds?: string[],
    filters?: AnalyticsFilter
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('budget_variance_report')
        .select('*')
        .order('variance_percentage', { ascending: false })

      if (projectIds && projectIds.length > 0) {
        query = query.in('project_id', projectIds)
      }

      if (filters?.dateRange) {
        query = query
          .gte('period_start', filters.dateRange.start)
          .lte('period_end', filters.dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching variance report:', error)
      throw error
    }
  }

  /**
   * Get cash flow projection data
   */
  static async getCashFlowProjection(
    projectIds?: string[],
    months: number = 12
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('cash_flow_projection_report')
        .select('*')
        .order('projection_month', { ascending: true })
        .limit(months)

      if (projectIds && projectIds.length > 0) {
        query = query.in('project_id', projectIds)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching cash flow projection:', error)
      throw error
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalyticsData(
    type: 'variance' | 'forecast' | 'health' | 'trends',
    projectId: string,
    format: 'csv' | 'excel' | 'pdf' = 'csv'
  ): Promise<Blob> {
    try {
      let data: any[] = []
      let headers: string[] = []
      let filename = `${type}_report_${projectId}`

      switch (type) {
        case 'variance':
          data = await this.getBudgetVariances(projectId)
          headers = ['Date', 'Item', 'Planned', 'Actual', 'Variance', 'Percentage', 'Type']
          break
        case 'forecast':
          data = await this.getBudgetForecasts(projectId)
          headers = ['Date', 'Item', 'Forecast', 'Confidence', 'Method']
          break
        case 'health':
          data = await this.getProjectHealthMetrics(projectId)
          headers = ['Date', 'Overall Score', 'Budget Score', 'Schedule Score', 'Quality Score', 'Risk Level']
          break
        case 'trends':
          data = await this.getCostTrends(projectId)
          headers = ['Period', 'Item', 'Direction', 'Strength', 'Avg Spend', 'Projected Cost']
          break
      }

      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n')

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    } catch (error) {
      console.error('Error exporting analytics data:', error)
      throw error
    }
  }
}
