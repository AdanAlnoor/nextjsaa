export interface TimeSavingsReport {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  periodStart: Date;
  periodEnd: Date;
  
  // Time metrics
  totalEstimatesCreated: number;
  averageTimeWithLibrary: number; // hours
  averageTimeWithoutLibrary: number; // hours (estimated baseline)
  timeSavedPerEstimate: number; // hours
  totalTimeSaved: number; // hours
  
  // Monetary metrics
  hourlyRate: number; // $/hour
  totalCostSavings: number; // $
  monthlyProjectedSavings: number; // $
  annualProjectedSavings: number; // $
  
  // Efficiency metrics
  libraryUsageRate: number; // % of estimates using library
  averageLibraryItemsPerEstimate: number;
  bulkOperationUsage: number; // % of users using bulk ops
  
  // Trends
  trendsOverTime: Array<{
    date: Date;
    estimatesCreated: number;
    avgTimePerEstimate: number;
    libraryCoverage: number;
  }>;
}

export interface AccuracyReport {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  periodStart: Date;
  periodEnd: Date;
  
  // Accuracy metrics
  estimateAccuracyBefore: number; // % (baseline)
  estimateAccuracyAfter: number; // % (with library)
  accuracyImprovement: number; // percentage points
  
  // Error metrics
  errorRateBefore: number; // % of estimates with errors
  errorRateAfter: number; // % of estimates with errors
  errorReduction: number; // percentage points
  
  // Cost of errors
  averageCostPerError: number; // $
  errorsPreventedPerMonth: number;
  costSavingsFromAccuracy: number; // $ per month
  
  // Quality metrics
  revisionRateBefore: number; // % estimates requiring revision
  revisionRateAfter: number; // % estimates requiring revision
  clientSatisfactionImprovement: number; // score improvement
}

export interface ProductivityReport {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  periodStart: Date;
  periodEnd: Date;
  
  // User productivity
  averageTasksPerHour: number;
  averageEstimatesPerDay: number;
  librarySearchEfficiency: number; // avg time to find items (seconds)
  
  // Feature usage
  featureAdoptionRates: {
    librarySearch: number; // % of active users
    bulkOperations: number;
    spreadsheetEditor: number;
    mobileApp: number;
    advancedFilters: number;
  };
  
  // Learning curve
  newUserTimeToCompetency: number; // days
  trainingTimeReduction: number; // % reduction in training time
  userSatisfactionScore: number; // 1-10 scale
  
  // Efficiency gains
  itemsAddedPerSession: number;
  averageSessionDuration: number; // minutes
  taskCompletionRate: number; // %
}

export interface ROIReport {
  period: 'monthly' | 'quarterly' | 'annual';
  periodStart: Date;
  periodEnd: Date;
  
  // Investment costs
  implementationCost: number; // $ one-time
  operationalCostPerMonth: number; // $ monthly
  trainingCostPerUser: number; // $ per user
  totalInvestment: number; // $ cumulative
  
  // Returns
  timeSavingsValue: number; // $ from time saved
  accuracyImprovementValue: number; // $ from reduced errors
  productivityGainsValue: number; // $ from efficiency
  totalMonthlyReturns: number; // $ per month
  
  // ROI calculations
  monthlyROI: number; // %
  cumulativeROI: number; // %
  paybackPeriod: number; // months
  netPresentValue: number; // $ (5-year projection)
  
  // Risk factors
  adoptionRisk: 'low' | 'medium' | 'high';
  technologyRisk: 'low' | 'medium' | 'high';
  operationalRisk: 'low' | 'medium' | 'high';
  
  // Future projections
  projectedSavingsYear1: number; // $
  projectedSavingsYear3: number; // $
  projectedSavingsYear5: number; // $
}

export class BusinessIntelligenceService {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async calculateTimeSavings(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' = 'monthly',
    customPeriodStart?: Date,
    customPeriodEnd?: Date
  ): Promise<TimeSavingsReport> {
    const { periodStart, periodEnd } = this.getPeriodDates(period, customPeriodStart, customPeriodEnd);
    
    // Get estimates created in period
    const { data: estimates } = await this.supabase
      .from('estimate_structures')
      .select('id, created_at, project_id')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());
    
    const totalEstimates = estimates?.length || 0;
    
    // Get library usage data
    const { data: libraryUsage } = await this.supabase
      .from('estimate_library_usage')
      .select('estimate_id, library_item_id, created_at')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());
    
    // Calculate metrics
    const estimatesUsingLibrary = new Set(libraryUsage?.map(u => u.estimate_id) || []).size;
    const libraryUsageRate = totalEstimates > 0 ? (estimatesUsingLibrary / totalEstimates) * 100 : 0;
    
    const totalLibraryItems = libraryUsage?.length || 0;
    const avgLibraryItemsPerEstimate = totalEstimates > 0 ? totalLibraryItems / totalEstimates : 0;
    
    // Time calculations (based on assumptions - would be better with actual tracking)
    const averageTimeWithoutLibrary = 8; // hours (baseline estimate)
    const timeSavingPerLibraryItem = 0.25; // 15 minutes saved per library item used
    const averageTimeWithLibrary = Math.max(
      averageTimeWithoutLibrary - (avgLibraryItemsPerEstimate * timeSavingPerLibraryItem),
      2 // minimum 2 hours per estimate
    );
    
    const timeSavedPerEstimate = averageTimeWithoutLibrary - averageTimeWithLibrary;
    const totalTimeSaved = timeSavedPerEstimate * totalEstimates;
    
    // Monetary calculations
    const hourlyRate = 75; // $75/hour default rate
    const totalCostSavings = totalTimeSaved * hourlyRate;
    
    // Projections
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const dailySavings = totalCostSavings / daysInPeriod;
    const monthlyProjectedSavings = dailySavings * 30;
    const annualProjectedSavings = dailySavings * 365;
    
    // Get trends data
    const trendsOverTime = await this.calculateTimeTrends(periodStart, periodEnd);
    
    // Get bulk operation usage
    const { data: bulkOps } = await this.supabase
      .from('operation_metrics')
      .select('user_id')
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());
    
    const bulkOperationUsers = new Set(bulkOps?.map(op => op.user_id) || []).size;
    const { data: allUsers } = await this.supabase
      .from('audit_logs')
      .select('user_id')
      .gte('timestamp', periodStart.toISOString())
      .not('user_id', 'is', null);
    
    const totalActiveUsers = new Set(allUsers?.map(log => log.user_id) || []).size;
    const bulkOperationUsage = totalActiveUsers > 0 ? (bulkOperationUsers / totalActiveUsers) * 100 : 0;

    return {
      period,
      periodStart,
      periodEnd,
      totalEstimatesCreated: totalEstimates,
      averageTimeWithLibrary,
      averageTimeWithoutLibrary,
      timeSavedPerEstimate,
      totalTimeSaved,
      hourlyRate,
      totalCostSavings,
      monthlyProjectedSavings,
      annualProjectedSavings,
      libraryUsageRate,
      averageLibraryItemsPerEstimate,
      bulkOperationUsage,
      trendsOverTime
    };
  }

  async calculateAccuracyImprovements(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' = 'monthly',
    customPeriodStart?: Date,
    customPeriodEnd?: Date
  ): Promise<AccuracyReport> {
    const { periodStart, periodEnd } = this.getPeriodDates(period, customPeriodStart, customPeriodEnd);
    
    // Baseline accuracy metrics (would be measured before library implementation)
    const estimateAccuracyBefore = 72; // % (baseline assumption)
    const errorRateBefore = 15; // % (baseline assumption)
    const revisionRateBefore = 25; // % (baseline assumption)
    
    // Current accuracy metrics (estimated based on library usage)
    const { data: libraryUsage } = await this.supabase
      .from('estimate_library_usage')
      .select('estimate_id')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());
    
    const estimatesWithLibrary = new Set(libraryUsage?.map(u => u.estimate_id) || []).size;
    
    const { data: allEstimates } = await this.supabase
      .from('estimate_structures')
      .select('id')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());
    
    const totalEstimates = allEstimates?.length || 0;
    const libraryAdoptionRate = totalEstimates > 0 ? estimatesWithLibrary / totalEstimates : 0;
    
    // Calculate improvement based on library adoption
    const accuracyImprovementFactor = libraryAdoptionRate * 0.2; // 20% max improvement
    const estimateAccuracyAfter = Math.min(estimateAccuracyBefore + (accuracyImprovementFactor * 100), 95);
    const accuracyImprovement = estimateAccuracyAfter - estimateAccuracyBefore;
    
    const errorReductionFactor = libraryAdoptionRate * 0.6; // 60% max error reduction
    const errorRateAfter = Math.max(errorRateBefore * (1 - errorReductionFactor), 2);
    const errorReduction = errorRateBefore - errorRateAfter;
    
    const revisionReductionFactor = libraryAdoptionRate * 0.4; // 40% max revision reduction
    const revisionRateAfter = Math.max(revisionRateBefore * (1 - revisionReductionFactor), 5);
    
    // Cost calculations
    const averageCostPerError = 2500; // $2,500 per error (time to fix + rework)
    const errorsPreventedPerMonth = (totalEstimates * (errorRateBefore - errorRateAfter)) / 100;
    const costSavingsFromAccuracy = errorsPreventedPerMonth * averageCostPerError;
    
    // Client satisfaction improvement (estimated)
    const clientSatisfactionImprovement = accuracyImprovement * 0.1; // 0.1 points per % accuracy

    return {
      period,
      periodStart,
      periodEnd,
      estimateAccuracyBefore,
      estimateAccuracyAfter,
      accuracyImprovement,
      errorRateBefore,
      errorRateAfter,
      errorReduction,
      averageCostPerError,
      errorsPreventedPerMonth,
      costSavingsFromAccuracy,
      revisionRateBefore,
      revisionRateAfter,
      clientSatisfactionImprovement
    };
  }

  async calculateUserProductivity(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' = 'monthly',
    customPeriodStart?: Date,
    customPeriodEnd?: Date
  ): Promise<ProductivityReport> {
    const { periodStart, periodEnd } = this.getPeriodDates(period, customPeriodStart, customPeriodEnd);
    
    // Get user activity data
    const { data: userSessions } = await this.supabase
      .from('user_behavior_events')
      .select('user_id, session_id, event_type, event_data, timestamp')
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());
    
    // Calculate session metrics
    const sessionsById = new Map();
    userSessions?.forEach(event => {
      if (!sessionsById.has(event.session_id)) {
        sessionsById.set(event.session_id, {
          userId: event.user_id,
          events: [],
          startTime: new Date(event.timestamp),
          endTime: new Date(event.timestamp)
        });
      }
      const session = sessionsById.get(event.session_id);
      session.events.push(event);
      session.endTime = new Date(event.timestamp);
    });
    
    // Calculate productivity metrics
    const sessions = Array.from(sessionsById.values());
    const totalSessions = sessions.length;
    
    const averageSessionDuration = totalSessions > 0 
      ? sessions.reduce((sum, session) => {
          return sum + (session.endTime.getTime() - session.startTime.getTime());
        }, 0) / totalSessions / (1000 * 60) // convert to minutes
      : 0;
    
    // Get estimates created
    const { data: estimates } = await this.supabase
      .from('estimate_structures')
      .select('created_by, created_at')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .not('created_by', 'is', null);
    
    const uniqueUsers = new Set(estimates?.map(e => e.created_by) || []).size;
    const totalEstimates = estimates?.length || 0;
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const averageEstimatesPerDay = totalEstimates / Math.max(daysInPeriod, 1);
    const averageTasksPerHour = averageEstimatesPerDay / 8; // assuming 8-hour workday
    
    // Feature adoption rates
    const featureEvents = userSessions?.filter(event => 
      event.event_data?.context?.includes('feature_usage')
    ) || [];
    
    const featureAdoptionRates = {
      librarySearch: this.calculateFeatureAdoption('library_search', userSessions || [], uniqueUsers),
      bulkOperations: this.calculateFeatureAdoption('bulk_operation', userSessions || [], uniqueUsers),
      spreadsheetEditor: this.calculateFeatureAdoption('spreadsheet', userSessions || [], uniqueUsers),
      mobileApp: this.calculateFeatureAdoption('mobile', userSessions || [], uniqueUsers),
      advancedFilters: this.calculateFeatureAdoption('filter', userSessions || [], uniqueUsers)
    };
    
    // Search efficiency
    const searchEvents = userSessions?.filter(event => 
      event.event_type === 'search' && event.event_data?.context === 'library_search'
    ) || [];
    
    const librarySearchEfficiency = searchEvents.length > 0
      ? searchEvents.reduce((sum, event) => sum + (event.event_data?.responseTime || 0), 0) / searchEvents.length / 1000
      : 0.5; // default 0.5 seconds
    
    // Library items usage
    const { data: libraryUsage } = await this.supabase
      .from('estimate_library_usage')
      .select('*')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());
    
    const itemsAddedPerSession = totalSessions > 0 ? (libraryUsage?.length || 0) / totalSessions : 0;
    
    return {
      period,
      periodStart,
      periodEnd,
      averageTasksPerHour,
      averageEstimatesPerDay,
      librarySearchEfficiency,
      featureAdoptionRates,
      newUserTimeToCompetency: 3, // days (estimated)
      trainingTimeReduction: 60, // % (estimated)
      userSatisfactionScore: 8.2, // 1-10 scale (estimated)
      itemsAddedPerSession,
      averageSessionDuration,
      taskCompletionRate: 89 // % (estimated)
    };
  }

  async generateROIReport(
    period: 'monthly' | 'quarterly' | 'annual' = 'monthly',
    customPeriodStart?: Date,
    customPeriodEnd?: Date
  ): Promise<ROIReport> {
    const { periodStart, periodEnd } = this.getPeriodDates(period, customPeriodStart, customPeriodEnd);
    
    // Get supporting data
    const timeSavings = await this.calculateTimeSavings(period, customPeriodStart, customPeriodEnd);
    const accuracyReport = await this.calculateAccuracyImprovements(period, customPeriodStart, customPeriodEnd);
    const productivityReport = await this.calculateUserProductivity(period, customPeriodStart, customPeriodEnd);
    
    // Investment costs (estimated)
    const implementationCost = 50000; // $50k one-time implementation
    const operationalCostPerMonth = 2000; // $2k monthly operational
    const trainingCostPerUser = 500; // $500 per user training
    
    // Get user count
    const { data: users } = await this.supabase
      .from('project_members')
      .select('user_id')
      .not('user_id', 'is', null);
    
    const totalUsers = new Set(users?.map(u => u.user_id) || []).size;
    const totalTrainingCost = totalUsers * trainingCostPerUser;
    
    const monthsInPeriod = this.getMonthsInPeriod(periodStart, periodEnd);
    const totalOperationalCost = operationalCostPerMonth * monthsInPeriod;
    const totalInvestment = implementationCost + totalTrainingCost + totalOperationalCost;
    
    // Returns calculation
    const timeSavingsValue = timeSavings.totalCostSavings;
    const accuracyImprovementValue = accuracyReport.costSavingsFromAccuracy * monthsInPeriod;
    const productivityGainsValue = timeSavingsValue * 0.2; // 20% additional productivity gains
    
    const totalMonthlyReturns = (timeSavingsValue + accuracyImprovementValue + productivityGainsValue) / monthsInPeriod;
    
    // ROI calculations
    const monthlyROI = operationalCostPerMonth > 0 
      ? ((totalMonthlyReturns - operationalCostPerMonth) / operationalCostPerMonth) * 100
      : 0;
    
    const cumulativeROI = totalInvestment > 0 
      ? ((timeSavingsValue + accuracyImprovementValue + productivityGainsValue - totalInvestment) / totalInvestment) * 100
      : 0;
    
    const paybackPeriod = totalMonthlyReturns > 0 
      ? Math.ceil(totalInvestment / totalMonthlyReturns)
      : 0;
    
    // NPV calculation (5-year projection with 8% discount rate)
    const discountRate = 0.08;
    const yearsToProject = 5;
    let netPresentValue = -totalInvestment;
    
    for (let year = 1; year <= yearsToProject; year++) {
      const annualCashFlow = totalMonthlyReturns * 12 - (operationalCostPerMonth * 12);
      const discountedCashFlow = annualCashFlow / Math.pow(1 + discountRate, year);
      netPresentValue += discountedCashFlow;
    }
    
    // Risk assessment
    const adoptionRisk = timeSavings.libraryUsageRate < 50 ? 'high' : 
                        timeSavings.libraryUsageRate < 80 ? 'medium' : 'low';
    
    const technologyRisk = 'low'; // Stable technology stack
    const operationalRisk = totalUsers > 100 ? 'medium' : 'low';
    
    // Future projections
    const projectedSavingsYear1 = totalMonthlyReturns * 12;
    const projectedSavingsYear3 = projectedSavingsYear1 * Math.pow(1.1, 3); // 10% annual growth
    const projectedSavingsYear5 = projectedSavingsYear1 * Math.pow(1.1, 5);

    return {
      period,
      periodStart,
      periodEnd,
      implementationCost,
      operationalCostPerMonth,
      trainingCostPerUser,
      totalInvestment,
      timeSavingsValue,
      accuracyImprovementValue,
      productivityGainsValue,
      totalMonthlyReturns,
      monthlyROI,
      cumulativeROI,
      paybackPeriod,
      netPresentValue,
      adoptionRisk,
      technologyRisk,
      operationalRisk,
      projectedSavingsYear1,
      projectedSavingsYear3,
      projectedSavingsYear5
    };
  }

  // Helper methods
  private getPeriodDates(
    period: string,
    customStart?: Date,
    customEnd?: Date
  ): { periodStart: Date; periodEnd: Date } {
    if (customStart && customEnd) {
      return { periodStart: customStart, periodEnd: customEnd };
    }

    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        periodStart = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'annual':
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { periodStart, periodEnd: now };
  }

  private getMonthsInPeriod(start: Date, end: Date): number {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth());
    return Math.max(months, 1);
  }

  private calculateFeatureAdoption(feature: string, events: any[], totalUsers: number): number {
    const usersUsingFeature = new Set(
      events
        .filter(event => 
          event.event_data?.context?.includes(feature) || 
          event.event_data?.featureName?.includes(feature)
        )
        .map(event => event.user_id)
    ).size;
    
    return totalUsers > 0 ? (usersUsingFeature / totalUsers) * 100 : 0;
  }

  private async calculateTimeTrends(start: Date, end: Date): Promise<Array<{
    date: Date;
    estimatesCreated: number;
    avgTimePerEstimate: number;
    libraryCoverage: number;
  }>> {
    // This would calculate weekly trends within the period
    const trends = [];
    const current = new Date(start);
    
    while (current <= end) {
      const weekEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const { data: weekEstimates } = await this.supabase
        .from('estimate_structures')
        .select('id')
        .gte('created_at', current.toISOString())
        .lte('created_at', weekEnd.toISOString());
      
      const { data: weekLibraryUsage } = await this.supabase
        .from('estimate_library_usage')
        .select('estimate_id')
        .gte('created_at', current.toISOString())
        .lte('created_at', weekEnd.toISOString());
      
      const estimatesCreated = weekEstimates?.length || 0;
      const estimatesWithLibrary = new Set(weekLibraryUsage?.map(u => u.estimate_id) || []).size;
      const libraryCoverage = estimatesCreated > 0 ? (estimatesWithLibrary / estimatesCreated) * 100 : 0;
      
      // Estimate time based on library coverage
      const baseTimePerEstimate = 8; // hours
      const timeReduction = libraryCoverage * 0.02; // 2% reduction per % coverage
      const avgTimePerEstimate = baseTimePerEstimate * (1 - timeReduction);
      
      trends.push({
        date: new Date(current),
        estimatesCreated,
        avgTimePerEstimate,
        libraryCoverage
      });
      
      current.setTime(weekEnd.getTime());
    }
    
    return trends;
  }
}