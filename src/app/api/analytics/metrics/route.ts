import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { Database } from '@/shared/types/supabase';

// Define specific types for our analytics queries
interface AuditLogRow {
  user_id: string;
  timestamp: string;
}

interface LibraryUsageRow {
  project_id: string;
  library_item_id: string;
  created_at: string;
}

interface PopularLibraryItemRow {
  id: string;
  code: string;
  name: string;
  usage_count: number;
}

type SupabaseClient = ReturnType<typeof createClient>;

export async function GET(request: NextRequest) {
  const supabase = createClient();

  try {
    // Get system health metrics
    const systemHealth = await getSystemHealthMetrics(supabase);
    
    // Get user engagement metrics
    const userEngagement = await getUserEngagementMetrics(supabase);
    
    // Get business impact metrics
    const businessImpact = await getBusinessImpactMetrics(supabase);
    
    // Get library usage statistics
    const libraryStats = await getLibraryUsageStats(supabase);

    const metrics = {
      timestamp: new Date().toISOString(),
      systemHealth,
      userEngagement,
      businessImpact,
      libraryStats,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error collecting analytics metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

async function getSystemHealthMetrics(supabase: SupabaseClient) {
  try {
    // Simple database health check
    const start = Date.now();
    const { data, error } = await supabase
      .from('library_items')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - start;
    
    // Get active user count (users active in last 5 minutes)
    const { data: activeUsers } = await supabase
      .from('audit_logs')
      .select('user_id')
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .not('user_id', 'is', null) as { data: AuditLogRow[] | null };
    
    const uniqueActiveUsers = new Set(activeUsers?.map(log => log.user_id) || []).size;

    return {
      uptime: 99.94, // This would come from monitoring service
      responseTime,
      errorRate: 0.08, // This would come from error tracking
      activeUsers: uniqueActiveUsers,
    };
  } catch (error) {
    return {
      uptime: 0,
      responseTime: -1,
      errorRate: 100,
      activeUsers: 0,
    };
  }
}

async function getUserEngagementMetrics(supabase: SupabaseClient) {
  try {
    // Get daily active users (last 24 hours)
    const { data: dailyUsers } = await supabase
      .from('audit_logs')
      .select('user_id')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('user_id', 'is', null) as { data: AuditLogRow[] | null };
    
    const dailyActiveUsers = new Set(dailyUsers?.map(log => log.user_id) || []).size;

    // Calculate feature adoption rates
    const { data: libraryUsage } = await supabase
      .from('estimate_library_usage')
      .select('project_id')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) as { data: LibraryUsageRow[] | null };
    
    const uniqueProjectsUsingLibrary = new Set(libraryUsage?.map(usage => usage.project_id) || []).size;
    
    // Get total active projects for comparison
    const { data: totalProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('status', 'active');
    
    const libraryAdoptionRate = totalProjects?.length 
      ? Math.round((uniqueProjectsUsingLibrary / totalProjects.length) * 100)
      : 0;

    return {
      dailyActiveUsers,
      avgSessionDuration: 24.5, // This would come from session tracking
      featureAdoption: {
        libraryUsage: libraryAdoptionRate,
        bulkOperations: 67, // Mock data - would track from usage analytics
        spreadsheetEditor: 45,
        mobileUsage: 34,
      },
    };
  } catch (error) {
    return {
      dailyActiveUsers: 0,
      avgSessionDuration: 0,
      featureAdoption: {
        libraryUsage: 0,
        bulkOperations: 0,
        spreadsheetEditor: 0,
        mobileUsage: 0,
      },
    };
  }
}

async function getBusinessImpactMetrics(supabase: SupabaseClient) {
  try {
    // Get estimate count for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const { data: monthlyEstimates } = await supabase
      .from('estimate_structures')
      .select('id')
      .gte('created_at', currentMonth.toISOString());
    
    const estimatesThisMonth = monthlyEstimates?.length || 0;

    // Calculate time savings based on library usage
    // Assumption: Each library item saves 15 minutes vs manual entry
    const { data: libraryUsageThisMonth } = await supabase
      .from('estimate_library_usage')
      .select('id')
      .gte('created_at', currentMonth.toISOString());
    
    const libraryItemsUsed = libraryUsageThisMonth?.length || 0;
    const timeSavingsHours = (libraryItemsUsed * 0.25); // 15 minutes per item
    const avgTimeSavingsPerEstimate = estimatesThisMonth > 0 
      ? timeSavingsHours / estimatesThisMonth 
      : 0;

    // Cost savings calculation (assuming $75/hour labor rate)
    const hourlyCost = 75;
    const monthlyCostSavings = timeSavingsHours * hourlyCost;

    return {
      timeSavingsPerEstimate: Math.round(avgTimeSavingsPerEstimate * 10) / 10,
      accuracyImprovement: 24, // Mock data - would track estimation accuracy
      monthlyCostSavings: Math.round(monthlyCostSavings),
      estimatesPerMonth: estimatesThisMonth,
    };
  } catch (error) {
    return {
      timeSavingsPerEstimate: 0,
      accuracyImprovement: 0,
      monthlyCostSavings: 0,
      estimatesPerMonth: 0,
    };
  }
}

async function getLibraryUsageStats(supabase: SupabaseClient) {
  try {
    // Get total library items
    const { data: allItems } = await supabase
      .from('library_items')
      .select('id')
      .eq('is_active', true);
    
    const totalItems = allItems?.length || 0;

    // Get items used this month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const { data: usedItems } = await supabase
      .from('estimate_library_usage')
      .select('library_item_id')
      .gte('created_at', currentMonth.toISOString()) as { data: LibraryUsageRow[] | null };
    
    const uniqueItemsUsed = new Set(usedItems?.map(usage => usage.library_item_id) || []).size;

    // Get popular items
    const { data: popularItemsData } = await supabase
      .from('mv_popular_library_items')
      .select('id, code, name, usage_count')
      .order('usage_count', { ascending: false })
      .limit(5) as { data: PopularLibraryItemRow[] | null };

    const popularItems = popularItemsData?.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      usageCount: item.usage_count || 0,
    })) || [];

    // Mock search metrics - would come from search analytics
    const searchMetrics = {
      avgSearchTime: 0.18,
      searchSuccessRate: 94.2,
      topSearchTerms: [
        { term: 'concrete', count: 234 },
        { term: 'steel', count: 187 },
        { term: 'block', count: 145 },
        { term: 'excavation', count: 98 },
        { term: 'formwork', count: 87 },
      ],
    };

    return {
      totalItems,
      itemsUsedThisMonth: uniqueItemsUsed,
      popularItems,
      searchMetrics,
    };
  } catch (error) {
    return {
      totalItems: 0,
      itemsUsedThisMonth: 0,
      popularItems: [],
      searchMetrics: {
        avgSearchTime: 0,
        searchSuccessRate: 0,
        topSearchTerms: [],
      },
    };
  }
}