import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UsageData {
  library_item_id: string;
  project_id: string;
  element_id?: string;
  quantity: number;
  created_at: string;
}

interface PopularityUpdate {
  library_item_id: string;
  usage_count_30d: number;
  last_used_at: string;
  popularity_score: number;
  commonly_paired_with: string[];
  updated_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting library popularity aggregation...')

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Log start of job
    const { data: logEntry } = await supabaseClient
      .from('background_job_logs')
      .insert({
        job_name: 'aggregate-library-popularity',
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { started_processing: true }
      })
      .select()
      .single()

    const jobLogId = logEntry?.id

    try {
      // Get usage statistics from the last 30 days
      const { data: usageStats, error: usageError } = await supabaseClient
        .from('estimate_library_usage')
        .select('library_item_id, project_id, element_id, quantity, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (usageError) {
        console.error('Error fetching usage stats:', usageError)
        throw usageError
      }

      console.log(`Processing ${usageStats?.length || 0} usage records`)

      // Group usage by library item
      const usageByItem = new Map<string, UsageData[]>()
      usageStats?.forEach(usage => {
        if (!usageByItem.has(usage.library_item_id)) {
          usageByItem.set(usage.library_item_id, [])
        }
        usageByItem.get(usage.library_item_id)!.push(usage)
      })

      // Calculate paired items (items used together in same projects)
      const pairedItems = new Map<string, Map<string, number>>()
      
      // Group by project to find co-occurrences
      const projectItems = new Map<string, Set<string>>()
      usageStats?.forEach(usage => {
        if (!projectItems.has(usage.project_id)) {
          projectItems.set(usage.project_id, new Set())
        }
        projectItems.get(usage.project_id)!.add(usage.library_item_id)
      })

      // Calculate co-occurrence scores
      projectItems.forEach((itemsInProject) => {
        const itemArray = Array.from(itemsInProject)
        for (let i = 0; i < itemArray.length; i++) {
          for (let j = i + 1; j < itemArray.length; j++) {
            const item1 = itemArray[i]
            const item2 = itemArray[j]
            
            // Track pairing for item1 with item2
            if (!pairedItems.has(item1)) {
              pairedItems.set(item1, new Map())
            }
            const item1Pairs = pairedItems.get(item1)!
            item1Pairs.set(item2, (item1Pairs.get(item2) || 0) + 1)
            
            // Track pairing for item2 with item1
            if (!pairedItems.has(item2)) {
              pairedItems.set(item2, new Map())
            }
            const item2Pairs = pairedItems.get(item2)!
            item2Pairs.set(item1, (item2Pairs.get(item1) || 0) + 1)
          }
        }
      })

      // Create popularity updates
      const popularityUpdates: PopularityUpdate[] = []
      const now = new Date().toISOString()

      usageByItem.forEach((usages, itemId) => {
        const usageCount = usages.length
        const lastUsed = usages.reduce((latest, usage) => {
          return usage.created_at > latest ? usage.created_at : latest
        }, usages[0].created_at)

        // Calculate popularity score (logarithmic scale 0-100)
        const popularityScore = calculatePopularityScore(usageCount)

        // Get top 5 most commonly paired items
        const itemPairs = pairedItems.get(itemId)
        const commonlyPairedWith = itemPairs 
          ? Array.from(itemPairs.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([pairedItemId]) => pairedItemId)
          : []

        popularityUpdates.push({
          library_item_id: itemId,
          usage_count_30d: usageCount,
          last_used_at: lastUsed,
          popularity_score: popularityScore,
          commonly_paired_with: commonlyPairedWith,
          updated_at: now
        })
      })

      console.log(`Updating popularity for ${popularityUpdates.length} items`)

      // Batch update popularity scores
      if (popularityUpdates.length > 0) {
        const { error: updateError } = await supabaseClient
          .from('library_item_popularity')
          .upsert(popularityUpdates, {
            onConflict: 'library_item_id'
          })

        if (updateError) {
          console.error('Error updating popularity:', updateError)
          throw updateError
        }
      }

      // Clean up old popularity records (items not used in 90+ days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: cleanupData, error: cleanupError } = await supabaseClient
        .from('library_item_popularity')
        .delete()
        .lt('last_used_at', ninetyDaysAgo.toISOString())
        .select('id')

      if (cleanupError) {
        console.error('Error cleaning up old data:', cleanupError)
        // Don't throw - cleanup is not critical
      }

      const cleanedCount = cleanupData?.length || 0

      // Update job log with success
      if (jobLogId) {
        await supabaseClient
          .from('background_job_logs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              items_processed: popularityUpdates.length,
              items_cleaned: cleanedCount,
              usage_records_analyzed: usageStats?.length || 0,
              projects_analyzed: projectItems.size,
              execution_time_ms: Date.now() - new Date(logEntry?.started_at).getTime()
            }
          })
          .eq('id', jobLogId)
      }

      console.log('Popularity aggregation completed successfully')

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: popularityUpdates.length,
          cleaned: cleanedCount,
          analyzed_records: usageStats?.length || 0,
          message: `Processed ${popularityUpdates.length} items, cleaned ${cleanedCount} old records`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (error) {
      console.error('Job execution error:', error)
      
      // Update job log with failure
      if (jobLogId) {
        await supabaseClient
          .from('background_job_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
            metadata: {
              error_details: error.stack,
              failed_at_step: 'aggregation'
            }
          })
          .eq('id', jobLogId)
      }

      throw error
    }

  } catch (error) {
    console.error('Popularity aggregation failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/**
 * Calculate popularity score on logarithmic scale (0-100)
 * More usage = higher score, but diminishing returns
 */
function calculatePopularityScore(usageCount: number): number {
  if (usageCount === 0) return 0
  
  // Logarithmic scoring with base adjustment
  // 1 use = ~10 points, 10 uses = ~30 points, 100 uses = ~60 points, 1000 uses = ~90 points
  const logBase = Math.log10(usageCount + 1)
  const maxLog = Math.log10(1001) // Max expected usage
  const score = (logBase / maxLog) * 100
  
  return Math.min(100, Math.round(score * 100) / 100) // Round to 2 decimal places
}