# Phase 3: Background Jobs & Edge Functions

## Student-Friendly Overview 📚

**What We're Building:** A system that does heavy work in the background so your app stays fast. Like having assistants who work overnight to prepare reports for the morning.

**Think of it like:** 
- **Regular way**: You wait at the coffee shop while they make your complex order
- **Background jobs**: You order via app, do other things, get notified when ready

**Duration**: 3 days  
**Priority**: HIGH  
**Prerequisites**: Phases 1 & 2 complete, Supabase CLI installed

## What Problem Does This Solve? 🤔

### Current Problems
1. **Slow Operations**: Updating 500 items = 30 seconds of frozen screen
2. **No Intelligence**: System doesn't know which items are popular
3. **Manual Reports**: Someone runs Excel reports every morning
4. **Lost History**: Can't see price trends over time
5. **Failed Operations**: If something fails, you start over

### The Solution
1. **Fast UI**: Click "Update All" → Instant response → Work continues in background
2. **Smart Suggestions**: "Users who need concrete also use rebar 89% of the time"
3. **Automated Reports**: Price trends calculated nightly, ready when you arrive
4. **Historical Data**: See how steel prices changed over last 6 months
5. **Automatic Retries**: Failed jobs retry automatically

## How Will We Know It Works? ✅

### Test Scenario 1: Background Processing
```typescript
// What you'll do:
1. Select 100+ items in library
2. Click "Update All Prices +10%"
3. See immediate response: "Update started, we'll email when done"
4. Continue using the app (not frozen!)
5. Get email in 2-3 minutes: "100 items updated successfully"

// How to verify:
- UI responsive immediately after clicking
- Background_jobs table shows job with status='processing'
- Items actually updated after job completes
- Email notification received
```

### Test Scenario 2: Popularity Tracking
```typescript
// What you'll do:
1. Use "CONC-C25" in 5 different estimates today
2. Use "STEEL-REBAR" in 4 estimates
3. Tomorrow, create new estimate
4. System suggests: "You might also need STEEL-REBAR"

// How to verify:
- Check popularity scores updated nightly
- Suggestions based on real usage
- More usage = higher suggestion rank
```

### Test Scenario 3: Price Snapshots
```typescript
// What you'll do:
1. Check price trend report
2. See graph showing concrete prices over 6 months
3. Identify that prices jumped 20% in March
4. Make informed bidding decisions

// How to verify:
- Daily snapshots captured automatically
- Historical data preserved
- Trends calculated and visualized
- No manual Excel work needed

## Business Requirements

### 1. Track Library Item Popularity for Intelligent Suggestions

**The Vibe:** Netflix algorithm but for construction items - "Because you used concrete, you might need rebar" 🎯

**Real Example:**
```typescript
// Every time someone uses an item in an estimate
const itemUsed = {
  library_item_id: "CONC-C25",
  project_id: "proj_downtown_tower",
  estimate_id: "est_building_foundation",
  quantity_used: 150.5,
  timestamp: new Date()
};

// Background job aggregates this data nightly
const popularityScores = {
  "CONC-C25": {
    usage_count_30d: 145,      // Used 145 times this month
    avg_quantity: 125.3,        // Average quantity per use
    trending: "up",             // 📈 20% increase from last month
    commonly_paired_with: [
      "REBAR-12MM",              // 89% of estimates
      "FORMWORK-PLYWOOD",        // 76% of estimates
      "CONCRETE-PUMP-HIRE"       // 65% of estimates
    ]
  }
};

// UI shows smart suggestions
// "💡 Tip: Projects using CONC-C25 typically also need REBAR-12MM"
```

**Supabase Edge Function:**
```sql
-- Track every item usage
CREATE TABLE estimate_library_usage (
  id UUID DEFAULT gen_random_uuid(),
  library_item_id UUID REFERENCES library_items(id),
  project_id UUID,
  estimate_id UUID,
  quantity DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Index for fast aggregation
  INDEX idx_usage_date (created_at, library_item_id)
);

-- Materialized view for instant suggestions
CREATE MATERIALIZED VIEW item_popularity_stats AS
SELECT 
  library_item_id,
  COUNT(*) as usage_count,
  COUNT(DISTINCT project_id) as unique_projects,
  ARRAY_AGG(DISTINCT paired_item_id) as commonly_paired
FROM estimate_library_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY library_item_id;
```

### 2. Capture Price Snapshots for Historical Analysis

**The Vibe:** Time machine for prices - see trends, predict future 📊

**Real Example:**
```typescript
// Daily snapshot captures current state
const priceSnapshot = {
  snapshot_date: "2024-05-15",
  items: [
    {
      code: "STEEL-REBAR-12MM",
      catalog_rate: 850.00,
      avg_project_rate: 925.00,  // Average across all projects
      min_project_rate: 800.00,   // Lowest project rate
      max_project_rate: 1100.00,  // Highest project rate
      volatility_score: 0.72      // How much prices vary
    }
  ]
};

// Quarterly analysis shows trends
const steelTrend = {
  item: "STEEL-REBAR-12MM",
  quarters: [
    { period: "Q1-2024", avg_rate: 800, change: 0 },
    { period: "Q2-2024", avg_rate: 925, change: +15.6 },  // 📈
    { period: "Q3-2024", avg_rate: 890, change: -3.8 },   // 📉
  ],
  forecast: {
    Q4_2024: { predicted: 950, confidence: 0.78 }
  }
};

// Alert when prices spike
if (priceChange > 20) {
  notify("⚠️ Steel prices up 20% - review active estimates");
}
```

**Supabase Scheduled Function:**
```typescript
// Runs daily at 2 AM
Deno.cron("capture price snapshots", "0 2 * * *", async () => {
  const snapshot = await db
    .from('library_catalogues_materials')
    .select('code, rate')
    .execute();
    
  const projectRates = await db
    .from('project_rates')
    .select('materials')
    .execute();
    
  // Calculate aggregates
  const analysis = calculatePriceMetrics(snapshot, projectRates);
  
  // Store snapshot
  await db
    .from('price_snapshots')
    .insert({
      snapshot_date: new Date(),
      data: analysis,
      metadata: { item_count: snapshot.length }
    });
});
```

### 3. Process Complex Calculations Asynchronously

**The Vibe:** Heavy lifting in the background - UI stays fast ⚡

**Real Example:**
```typescript
// User updates assembly with 500+ child items
const complexUpdate = {
  assembly: "BUILDING-COMPLETE",
  change: "Update all concrete items to new mix design",
  affected_items: 547
};

// Instead of waiting 30 seconds...
const jobId = await queueBackgroundJob({
  type: "bulk_assembly_update",
  payload: complexUpdate,
  priority: "high"
});

// User sees immediate response
return { 
  message: "Update queued",
  jobId,
  estimatedTime: "2-3 minutes",
  notificationMethod: "email"
};

// Edge function processes in background
async function processAssemblyUpdate(job) {
  const items = await getAssemblyItems(job.assembly);
  
  for (const batch of chunk(items, 50)) {
    await updateBatch(batch);
    await updateProgress(job.id, processed / total);
  }
  
  await notifyUser({
    email: job.user_email,
    subject: "Assembly update complete",
    summary: `Updated ${items.length} items successfully`
  });
}
```

**Supabase Queue Implementation:**
```sql
-- Job queue table
CREATE TABLE background_jobs (
  id UUID DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  priority INT DEFAULT 5,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  progress DECIMAL DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  INDEX idx_job_status (status, priority, created_at)
);

-- Worker picks up jobs
CREATE FUNCTION get_next_job() RETURNS background_jobs AS $$
  UPDATE background_jobs
  SET status = 'processing', started_at = NOW()
  WHERE id = (
    SELECT id FROM background_jobs
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql;
```

### 4. Schedule Recurring Jobs for Data Aggregation

**The Vibe:** Set it and forget it - like a construction site coffee machine ☕

**Real Example:**
```typescript
// Cron schedules
const schedules = {
  // Every hour: Update frequently used items cache
  "0 * * * *": updatePopularItemsCache,
  
  // Daily at 2 AM: Capture price snapshots
  "0 2 * * *": capturePriceSnapshots,
  
  // Weekly Sunday: Generate usage reports
  "0 0 * * 0": generateWeeklyReports,
  
  // Monthly: Archive old data
  "0 0 1 * *": archiveOldEstimates,
  
  // Every 15 minutes: Process pending calculations
  "*/15 * * * *": processPendingJobs
};

// Smart scheduling based on load
const adaptiveSchedule = async () => {
  const systemLoad = await getSystemLoad();
  
  if (systemLoad < 0.3) {
    // Quiet time - run maintenance
    await runOptimization();
    await rebuildIndexes();
  } else if (systemLoad > 0.8) {
    // Busy - defer non-critical jobs
    await deferJob('archive_old_data', '2 hours');
  }
};
```

**Supabase Cron Setup:**
```sql
-- Using pg_cron extension
SELECT cron.schedule(
  'aggregate-popularity',
  '0 * * * *',  -- Every hour
  $$
    SELECT aggregate_library_popularity();
    SELECT cleanup_old_usage_data();
  $$
);

-- Monitor job execution
CREATE VIEW cron_job_stats AS
SELECT 
  jobname,
  COUNT(*) FILTER (WHERE status = 'succeeded') as success_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failure_count,
  AVG(EXTRACT(EPOCH FROM end_time - start_time)) as avg_duration_seconds,
  MAX(end_time) as last_run
FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '7 days'
GROUP BY jobname;
```

### 5. Monitor Job Execution and Handle Failures

**The Vibe:** Like a site supervisor for your background tasks - nothing falls through cracks 👷

**Real Example:**
```typescript
// Job monitoring dashboard data
const jobMetrics = {
  last_24h: {
    total_jobs: 1247,
    succeeded: 1198,
    failed: 23,
    retried: 26,
    avg_duration: "3.2 seconds",
    queue_depth: 15
  },
  
  failing_jobs: [
    {
      type: "price_snapshot",
      error: "Timeout: External API not responding",
      failure_rate: "15%",
      last_success: "2 hours ago",
      action: "Auto-retry with exponential backoff"
    }
  ],
  
  alerts: [
    {
      severity: "warning",
      message: "Job queue depth > 100",
      suggested_action: "Scale up workers"
    }
  ]
};

// Automatic failure recovery
const handleJobFailure = async (job, error) => {
  // Log error with context
  await logError({
    job_id: job.id,
    error: error.message,
    stack: error.stack,
    context: job.payload
  });
  
  // Retry logic
  if (job.attempts < job.max_attempts) {
    const delay = Math.pow(2, job.attempts) * 1000; // Exponential backoff
    await scheduleRetry(job, delay);
  } else {
    // Max retries reached
    await notifyAdmin({
      subject: `Job ${job.type} failed after ${job.attempts} attempts`,
      job_details: job,
      error_log: await getJobErrorLog(job.id)
    });
    
    // Dead letter queue
    await moveToDeadLetter(job);
  }
};
```

**Supabase Monitoring Setup:**
```sql
-- Real-time job monitoring
CREATE VIEW job_health_metrics AS
SELECT 
  type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM completed_at - started_at)) as avg_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM completed_at - started_at)
  ) as p95_duration
FROM background_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type, status;

-- Alert on failures
CREATE FUNCTION check_job_health() RETURNS void AS $$
DECLARE
  failure_rate DECIMAL;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*)
  INTO failure_rate
  FROM background_jobs
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  IF failure_rate > 10 THEN
    PERFORM notify_webhook(
      'https://api.company.com/alerts',
      json_build_object(
        'alert', 'High job failure rate',
        'rate', failure_rate,
        'action_required', true
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Why This Matters:**
- System learns what users need and suggests it
- Price trends help win competitive bids
- Complex operations don't freeze the UI
- Automation reduces manual work
- Problems get caught and fixed automatically

## What Gets Built - Component by Component 🔨

### 1. The Job Queue System
**What:** A task list that processes work in order
**Like:** A restaurant order ticket system

```
Job Queue Table:
┌────────────────┬──────────┬──────────┬──────────┐
│ Job Type       │ Status   │ Progress │ Priority │
├────────────────┼──────────┼──────────┼──────────┤
│ Update Prices  │ Running  │ 45%      │ High     │
│ Calculate Pop. │ Queued   │ 0%       │ Medium   │
│ Price Snapshot │ Complete │ 100%     │ Low      │
└────────────────┴──────────┴──────────┴──────────┘
```

### 2. Edge Functions (The Workers)
**What:** Mini-programs that run on Supabase servers
**Like:** Robots that work 24/7

```typescript
Edge Functions we'll create:
1. aggregate-popularity     // Counts item usage
2. capture-price-snapshot  // Saves daily prices  
3. process-bulk-updates    // Handles large operations
4. calculate-trends        // Analyzes patterns
5. cleanup-old-data       // Removes old records
```

### 3. The Scheduler (Cron Jobs)
**What:** Automatic timer that runs jobs
**Like:** An alarm clock for computer tasks

```
Schedule:
┌─────────────────────┬────────────┬──────────┐
│ Job                 │ Schedule   │ Next Run │
├─────────────────────┼────────────┼──────────┤
│ Popularity Update   │ Every hour │ 2:00 PM  │
│ Price Snapshot      │ Daily 2AM  │ Tomorrow │
│ Weekly Reports      │ Mondays    │ Monday   │
│ Cleanup Old Data    │ Monthly    │ June 1   │
└─────────────────────┴────────────┴──────────┘
```

### 4. The Monitoring Dashboard
**What:** Shows status of all background work
**Like:** Air traffic control for your jobs

```
Background Jobs Dashboard
━━━━━━━━━━━━━━━━━━━━━━━
Today's Stats:
✓ Completed: 145
⚡ Running: 3
⏳ Queued: 12
❌ Failed: 2

Recent Jobs:
[====|====] Update Prices (45% - 2 min remaining)
[==========] Calculate Popularity (100% - Complete)
[Queued...] Generate Report (Starts in 5 min)

Alerts:
⚠️ Price snapshot failed at 2 AM - Retrying...
```

### 5. The Notification System
**What:** Tells users when jobs complete
**Like:** Delivery notifications for your tasks

```typescript
Notification Types:
- Email: "Your bulk update completed successfully"
- In-app: Badge shows (3) completed jobs
- Dashboard: Green checkmark on completed tasks
- Webhook: Notify external systems
```

## Step-by-Step: What Happens in Background Jobs 📝

### Example: Bulk Price Update Flow
```
User Action:
1. Select 500 items
2. Click "Increase all by 10%"
3. Confirm action

What happens next:
→ UI shows "Job queued" immediately
→ User continues working
→ Job added to queue with ID #1234

Background Process:
1. Worker picks up job #1234
2. Loads 500 items in batches of 50
3. Updates each batch:
   - Batch 1: ✓ (10%)
   - Batch 2: ✓ (20%)
   - ...
   - Batch 10: ✓ (100%)
4. Sends completion email
5. Updates dashboard

If something fails:
→ Automatic retry (up to 3 times)
→ If still fails, notify admin
→ Save progress (don't restart from 0)
```

### Example: Nightly Popularity Calculation
```
Every night at 2 AM:
1. Cron trigger activates
2. Edge function starts
3. Queries last 30 days of usage:
   - CONC-C25: used 145 times
   - STEEL-REBAR: used 132 times
   - FORMWORK: used 98 times
4. Calculates associations:
   - CONC-C25 + STEEL-REBAR: 89%
   - CONC-C25 + FORMWORK: 76%
5. Updates popularity scores
6. Refreshes suggestion cache
7. Ready for morning users
```

## How to Test Everything Works 🧪

### Developer Testing
```typescript
// Test 1: Job Queue
async function testJobQueue() {
  // Queue a job
  const job = await queueJob({
    type: 'test_job',
    payload: { message: 'Hello' },
    priority: 5
  });
  
  // Check it's queued
  assert(job.status === 'pending');
  
  // Wait for processing
  await sleep(5000);
  
  // Check completion
  const completed = await getJob(job.id);
  assert(completed.status === 'completed');
}

// Test 2: Retry Logic
async function testRetryLogic() {
  // Queue job that fails first time
  const job = await queueJob({
    type: 'failing_job',
    payload: { fail_times: 2 }
  });
  
  // Wait for retries
  await sleep(10000);
  
  // Should succeed on 3rd try
  const result = await getJob(job.id);
  assert(result.attempts === 3);
  assert(result.status === 'completed');
}
```

### User Testing Checklist
```
□ Background Processing
  1. Trigger bulk update (100+ items)
  2. Verify immediate UI response
  3. Check job appears in dashboard
  4. Monitor progress updates
  5. Verify completion notification

□ Popularity System
  1. Use same item in 5 estimates
  2. Wait for nightly job (or trigger manually)
  3. Create new estimate
  4. Verify item appears in suggestions
  5. Check suggestion accuracy

□ Price Snapshots
  1. Set different prices on Monday
  2. Change prices on Wednesday
  3. Run trend report on Friday
  4. Verify both price points captured
  5. Check trend calculation correct

□ Job Monitoring
  1. Open jobs dashboard
  2. Trigger various jobs
  3. Watch real-time updates
  4. Verify progress bars accurate
  5. Check completion notifications

□ Failure Handling
  1. Trigger job that will fail
  2. Verify retry attempts
  3. Check exponential backoff
  4. Verify admin notification
  5. Confirm job moved to dead letter
```

## Common Issues and Solutions 🔧

### Issue: "Job stuck in processing"
**Check:**
```sql
-- Find stuck jobs
SELECT * FROM background_jobs 
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '1 hour';

-- Reset if needed
UPDATE background_jobs 
SET status = 'pending', attempts = attempts + 1
WHERE id = 'stuck-job-id';
```

### Issue: "Popularity not updating"
**Check:**
1. Is cron job scheduled?
2. Any errors in edge function logs?
3. Usage data being recorded?

### Issue: "Not getting notifications"
**Verify:**
1. Email service configured
2. User has valid email
3. Notification preferences set
4. Check spam folder

## Success Metrics 📊

Phase 3 is successful when:
1. **Performance**: No operation blocks UI for >2 seconds
2. **Intelligence**: 80% of suggestions are used by estimators
3. **Automation**: Zero manual report generation
4. **Reliability**: 95% of jobs complete successfully
5. **Visibility**: All users can track their job status
6. **Trends**: Can see 6 months of price history instantly

## Technical Implementation

### Step 1: Create Edge Function for Popularity Aggregation

**File**: `supabase/functions/aggregate-library-popularity/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Aggregate usage data from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get usage statistics grouped by library item
    const { data: usageStats, error: usageError } = await supabaseClient
      .from('estimate_library_usage')
      .select('library_item_id')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (usageError) throw usageError

    // Count usage per item
    const usageCount = usageStats?.reduce((acc, item) => {
      acc[item.library_item_id] = (acc[item.library_item_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Update popularity scores
    const updates = Object.entries(usageCount).map(([itemId, count]) => ({
      library_item_id: itemId,
      usage_count_30d: count,
      last_used_at: new Date().toISOString(),
      popularity_score: calculatePopularityScore(count),
      updated_at: new Date().toISOString()
    }))

    if (updates.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('library_item_popularity')
        .upsert(updates, {
          onConflict: 'library_item_id'
        })

      if (updateError) {
        console.error('Error updating popularity:', updateError)
        throw updateError
      }
    }

    // Clean up old unused items
    const { error: cleanupError } = await supabaseClient
      .from('library_item_popularity')
      .delete()
      .lt('last_used_at', thirtyDaysAgo.toISOString())

    if (cleanupError) {
      console.error('Error cleaning up old data:', cleanupError)
    }

    // Log job execution
    await supabaseClient
      .from('background_job_logs')
      .insert({
        job_name: 'aggregate-library-popularity',
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          items_processed: updates.length,
          items_cleaned: 0
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: updates.length,
        message: `Processed ${updates.length} items`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    // Log job failure
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabaseClient
      .from('background_job_logs')
      .insert({
        job_name: 'aggregate-library-popularity',
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      })

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function calculatePopularityScore(usageCount: number): number {
  // Logarithmic scoring to handle wide usage ranges
  // Score from 0-100 based on usage
  const base = Math.log10(usageCount + 1)
  const max = Math.log10(1000) // Assume 1000 uses is maximum
  return Math.min(100, (base / max) * 100)
}
```

### Step 2: Create Edge Function for Price Snapshots

**File**: `supabase/functions/capture-price-snapshot/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectId } = await req.json()
    
    if (!projectId) {
      throw new Error('Project ID is required')
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current project rates
    const { data: projectRates, error: ratesError } = await supabaseClient
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()

    if (ratesError && ratesError.code !== 'PGRST116') throw ratesError

    // Get all library items used in the project
    const { data: usedItems, error: itemsError } = await supabaseClient
      .from('estimate_detail_items')
      .select('library_item_id, quantity')
      .eq('project_id', projectId)
      .not('library_item_id', 'is', null)

    if (itemsError) throw itemsError

    // Group by library item and sum quantities
    const itemQuantities = usedItems?.reduce((acc, item) => {
      if (item.library_item_id) {
        acc[item.library_item_id] = (acc[item.library_item_id] || 0) + item.quantity
      }
      return acc
    }, {} as Record<string, number>) || {}

    // Create price snapshot
    const snapshot = {
      project_id: projectId,
      snapshot_date: new Date().toISOString(),
      project_rates: projectRates || {},
      item_prices: {} as Record<string, any>,
      metadata: {
        total_items: Object.keys(itemQuantities).length,
        total_quantity: Object.values(itemQuantities).reduce((a, b) => a + b, 0)
      }
    }

    // Calculate prices for each unique item
    for (const [itemId, totalQuantity] of Object.entries(itemQuantities)) {
      try {
        // Get item details with factors
        const { data: item } = await supabaseClient
          .from('library_items')
          .select(`
            *,
            material_factors(
              quantity_per_unit,
              wastage_percentage,
              material_catalogue_id
            ),
            labor_factors(
              hours_per_unit,
              productivity_factor,
              labor_catalogue_id
            ),
            equipment_factors(
              hours_per_unit,
              utilization_factor,
              equipment_catalogue_id
            )
          `)
          .eq('id', itemId)
          .single()

        if (item) {
          // Calculate costs based on factors and rates
          const materialCost = calculateMaterialCost(item.material_factors, projectRates?.materials || {})
          const laborCost = calculateLaborCost(item.labor_factors, projectRates?.labour || {})
          const equipmentCost = calculateEquipmentCost(item.equipment_factors, projectRates?.equipment || {})
          
          snapshot.item_prices[itemId] = {
            item_code: item.code,
            item_name: item.name,
            unit_price: materialCost + laborCost + equipmentCost,
            material_cost: materialCost,
            labor_cost: laborCost,
            equipment_cost: equipmentCost,
            total_quantity: totalQuantity,
            total_cost: (materialCost + laborCost + equipmentCost) * totalQuantity
          }
        }
      } catch (error) {
        console.error(`Error calculating price for item ${itemId}:`, error)
      }
    }

    // Store snapshot
    const { error: snapshotError } = await supabaseClient
      .from('price_snapshots')
      .insert(snapshot)

    if (snapshotError) throw snapshotError

    // Log job execution
    await supabaseClient
      .from('background_job_logs')
      .insert({
        job_name: 'capture-price-snapshot',
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          project_id: projectId,
          items_processed: Object.keys(snapshot.item_prices).length
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        items_processed: Object.keys(snapshot.item_prices).length,
        total_cost: Object.values(snapshot.item_prices).reduce(
          (sum: number, item: any) => sum + item.total_cost, 0
        )
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function calculateMaterialCost(factors: any[], rates: Record<string, number>): number {
  return factors?.reduce((total, factor) => {
    const rate = rates[factor.material_catalogue_id] || 0
    const quantity = factor.quantity_per_unit * (1 + (factor.wastage_percentage || 0) / 100)
    return total + (quantity * rate)
  }, 0) || 0
}

function calculateLaborCost(factors: any[], rates: Record<string, number>): number {
  return factors?.reduce((total, factor) => {
    const rate = rates[factor.labor_catalogue_id] || 0
    const hours = factor.hours_per_unit * (factor.productivity_factor || 1)
    return total + (hours * rate)
  }, 0) || 0
}

function calculateEquipmentCost(factors: any[], rates: Record<string, number>): number {
  return factors?.reduce((total, factor) => {
    const rate = rates[factor.equipment_catalogue_id] || 0
    const hours = factor.hours_per_unit * (factor.utilization_factor || 1)
    return total + (hours * rate)
  }, 0) || 0
}
```

### Step 3: Create Complex Calculations Edge Function

**File**: `supabase/functions/calculate-complex-factors/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      libraryItemIds, 
      projectId, 
      options = {} 
    } = await req.json()

    const {
      includeIndirectCosts = false,
      includeOverheads = false,
      includeContingency = false,
      indirectCostPercentage = 15,
      overheadPercentage = 10,
      contingencyPercentage = 5
    } = options

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get project rates
    const { data: projectRates } = await supabaseClient
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()

    const rates = projectRates || { materials: {}, labour: {}, equipment: {} }
    const results = []

    // Process each library item
    for (const itemId of libraryItemIds) {
      try {
        // Get item with all factors
        const { data: item } = await supabaseClient
          .from('library_items')
          .select(`
            *,
            material_factors(
              id,
              quantity_per_unit,
              wastage_percentage,
              material_catalogue_id,
              material:material_catalogue(code, name, unit, rate)
            ),
            labor_factors(
              id,
              hours_per_unit,
              productivity_factor,
              crew_size,
              labor_catalogue_id,
              labor:labor_catalogue(code, name, rate)
            ),
            equipment_factors(
              id,
              hours_per_unit,
              utilization_factor,
              equipment_catalogue_id,
              equipment:equipment_catalogue(code, name, rate)
            )
          `)
          .eq('id', itemId)
          .single()

        if (!item) continue

        // Calculate base costs
        let materialCost = 0
        let laborCost = 0
        let equipmentCost = 0

        // Material calculations
        const materialDetails = item.material_factors?.map(factor => {
          const rate = rates.materials[factor.material_catalogue_id] || factor.material?.rate || 0
          const wastageMultiplier = 1 + (factor.wastage_percentage || 0) / 100
          const effectiveQuantity = factor.quantity_per_unit * wastageMultiplier
          const cost = effectiveQuantity * rate

          materialCost += cost

          return {
            material_code: factor.material?.code,
            material_name: factor.material?.name,
            quantity: factor.quantity_per_unit,
            wastage: factor.wastage_percentage,
            effective_quantity: effectiveQuantity,
            rate,
            cost
          }
        }) || []

        // Labor calculations
        const laborDetails = item.labor_factors?.map(factor => {
          const rate = rates.labour[factor.labor_catalogue_id] || factor.labor?.rate || 0
          const productivityAdjusted = factor.hours_per_unit / (factor.productivity_factor || 1)
          const crewHours = productivityAdjusted * (factor.crew_size || 1)
          const cost = crewHours * rate

          laborCost += cost

          return {
            labor_code: factor.labor?.code,
            labor_name: factor.labor?.name,
            hours: factor.hours_per_unit,
            productivity: factor.productivity_factor,
            crew_size: factor.crew_size,
            effective_hours: crewHours,
            rate,
            cost
          }
        }) || []

        // Equipment calculations
        const equipmentDetails = item.equipment_factors?.map(factor => {
          const rate = rates.equipment[factor.equipment_catalogue_id] || factor.equipment?.rate || 0
          const effectiveHours = factor.hours_per_unit * (factor.utilization_factor || 1)
          const cost = effectiveHours * rate

          equipmentCost += cost

          return {
            equipment_code: factor.equipment?.code,
            equipment_name: factor.equipment?.name,
            hours: factor.hours_per_unit,
            utilization: factor.utilization_factor,
            effective_hours: effectiveHours,
            rate,
            cost
          }
        }) || []

        // Calculate additional costs
        const directCost = materialCost + laborCost + equipmentCost
        let indirectCost = 0
        let overhead = 0
        let contingency = 0

        if (includeIndirectCosts) {
          indirectCost = directCost * (indirectCostPercentage / 100)
        }

        if (includeOverheads) {
          overhead = (directCost + indirectCost) * (overheadPercentage / 100)
        }

        if (includeContingency) {
          contingency = (directCost + indirectCost + overhead) * (contingencyPercentage / 100)
        }

        const totalCost = directCost + indirectCost + overhead + contingency

        results.push({
          library_item_id: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          costs: {
            material: materialCost,
            labor: laborCost,
            equipment: equipmentCost,
            direct_total: directCost,
            indirect: indirectCost,
            overhead: overhead,
            contingency: contingency,
            total: totalCost
          },
          details: {
            materials: materialDetails,
            labor: laborDetails,
            equipment: equipmentDetails
          },
          rates_used: {
            materials: rates.materials,
            labour: rates.labour,
            equipment: rates.equipment
          },
          calculation_date: new Date().toISOString()
        })

      } catch (error) {
        console.error(`Error calculating factors for item ${itemId}:`, error)
        results.push({
          library_item_id: itemId,
          error: error.message
        })
      }
    }

    // Log job execution
    await supabaseClient
      .from('background_job_logs')
      .insert({
        job_name: 'calculate-complex-factors',
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          project_id: projectId,
          items_processed: results.length,
          options_used: options
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        summary: {
          items_processed: results.length,
          total_cost: results.reduce((sum, item) => sum + (item.costs?.total || 0), 0)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

### Step 4: Create Background Job Service

**File**: `src/features/library/services/backgroundJobService.ts`

```typescript
import { createClient } from '@/shared/lib/supabase/client';

export interface JobSchedule {
  jobId: string;
  name: string;
  interval: number; // milliseconds
  enabled: boolean;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  executedAt: Date;
}

export class BackgroundJobService {
  private static instance: BackgroundJobService;
  private supabase: any;
  private jobs: Map<string, NodeJS.Timeout> = new Map();
  private schedules: Map<string, JobSchedule> = new Map();

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): BackgroundJobService {
    if (!this.instance) {
      this.instance = new BackgroundJobService();
    }
    return this.instance;
  }

  /**
   * Initialize all scheduled jobs
   */
  async initialize() {
    // Default job schedules
    this.schedulePopularityAggregation(24); // Every 24 hours
    this.schedulePriceSnapshots(7 * 24); // Every 7 days
    
    console.log('Background job service initialized');
  }

  /**
   * Schedule popularity aggregation job
   */
  schedulePopularityAggregation(intervalHours: number = 24) {
    const jobId = 'popularity-aggregation';
    const schedule: JobSchedule = {
      jobId,
      name: 'Library Popularity Aggregation',
      interval: intervalHours * 60 * 60 * 1000,
      enabled: true
    };

    this.stopJob(jobId);
    this.schedules.set(jobId, schedule);

    if (schedule.enabled) {
      const job = setInterval(async () => {
        await this.runPopularityAggregation();
      }, schedule.interval);

      this.jobs.set(jobId, job);
      
      // Run immediately on schedule
      this.runPopularityAggregation();
    }
  }

  /**
   * Run popularity aggregation manually
   */
  async runPopularityAggregation(): Promise<JobResult> {
    try {
      console.log('Running popularity aggregation...');
      
      const { data, error } = await this.supabase.functions.invoke(
        'aggregate-library-popularity'
      );
      
      if (error) throw error;

      return {
        success: true,
        data,
        executedAt: new Date()
      };
    } catch (error) {
      console.error('Popularity aggregation failed:', error);
      return {
        success: false,
        error: error.message,
        executedAt: new Date()
      };
    }
  }

  /**
   * Schedule price snapshots for all active projects
   */
  schedulePriceSnapshots(intervalHours: number = 168) { // Default weekly
    const jobId = 'price-snapshots';
    const schedule: JobSchedule = {
      jobId,
      name: 'Project Price Snapshots',
      interval: intervalHours * 60 * 60 * 1000,
      enabled: true
    };

    this.stopJob(jobId);
    this.schedules.set(jobId, schedule);

    if (schedule.enabled) {
      const job = setInterval(async () => {
        await this.runPriceSnapshots();
      }, schedule.interval);

      this.jobs.set(jobId, job);
    }
  }

  /**
   * Run price snapshots for all projects
   */
  async runPriceSnapshots(): Promise<JobResult> {
    try {
      console.log('Running price snapshots...');
      
      // Get all active projects
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      // Capture snapshot for each project
      for (const project of projects || []) {
        try {
          const { data, error } = await this.capturePriceSnapshot(project.id);
          if (error) throw error;
          
          results.push({ projectId: project.id, success: true });
          successCount++;
        } catch (error) {
          console.error(`Failed to capture snapshot for project ${project.id}:`, error);
          results.push({ projectId: project.id, success: false, error: error.message });
          failureCount++;
        }
      }

      return {
        success: failureCount === 0,
        data: {
          processed: projects?.length || 0,
          successful: successCount,
          failed: failureCount,
          results
        },
        executedAt: new Date()
      };
    } catch (error) {
      console.error('Price snapshots job failed:', error);
      return {
        success: false,
        error: error.message,
        executedAt: new Date()
      };
    }
  }

  /**
   * Capture price snapshot for a specific project
   */
  async capturePriceSnapshot(projectId: string): Promise<JobResult> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'capture-price-snapshot',
        {
          body: { projectId }
        }
      );
      
      if (error) throw error;

      return {
        success: true,
        data,
        executedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executedAt: new Date()
      };
    }
  }

  /**
   * Run complex factor calculations
   */
  async calculateComplexFactors(
    libraryItemIds: string[],
    projectId: string,
    options: {
      includeIndirectCosts?: boolean;
      includeOverheads?: boolean;
      includeContingency?: boolean;
      indirectCostPercentage?: number;
      overheadPercentage?: number;
      contingencyPercentage?: number;
    } = {}
  ): Promise<any> {
    const { data, error } = await this.supabase.functions.invoke(
      'calculate-complex-factors',
      {
        body: {
          libraryItemIds,
          projectId,
          options
        }
      }
    );
    
    if (error) throw error;
    return data;
  }

  /**
   * Get job execution history
   */
  async getJobHistory(
    jobName?: string,
    limit: number = 50
  ): Promise<Array<{
    id: string;
    job_name: string;
    status: string;
    started_at: string;
    completed_at?: string;
    error_message?: string;
    metadata?: any;
  }>> {
    let query = this.supabase
      .from('background_job_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (jobName) {
      query = query.eq('job_name', jobName);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Get active schedules
   */
  getActiveSchedules(): JobSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Stop a specific job
   */
  stopJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      clearInterval(job);
      this.jobs.delete(jobId);
    }
  }

  /**
   * Stop all background jobs
   */
  stopAllJobs() {
    for (const [jobId, job] of this.jobs) {
      clearInterval(job);
    }
    this.jobs.clear();
    this.schedules.clear();
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean) {
    const schedule = this.schedules.get(jobId);
    if (schedule) {
      schedule.enabled = enabled;
      
      if (enabled) {
        // Restart the job
        if (jobId === 'popularity-aggregation') {
          this.schedulePopularityAggregation(schedule.interval / (60 * 60 * 1000));
        } else if (jobId === 'price-snapshots') {
          this.schedulePriceSnapshots(schedule.interval / (60 * 60 * 1000));
        }
      } else {
        // Stop the job
        this.stopJob(jobId);
      }
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    schedule?: JobSchedule;
    lastExecution?: any;
    isRunning: boolean;
  }> {
    const schedule = this.schedules.get(jobId);
    const isRunning = this.jobs.has(jobId);

    // Get last execution from logs
    const { data: logs } = await this.supabase
      .from('background_job_logs')
      .select('*')
      .eq('job_name', jobId)
      .order('started_at', { ascending: false })
      .limit(1);

    return {
      schedule,
      lastExecution: logs?.[0],
      isRunning
    };
  }
}
```

### Step 5: Create Job Management UI

**File**: `src/features/library/components/jobs/BackgroundJobsManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { BackgroundJobService } from '../../services/backgroundJobService';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import { Play, Pause, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/shared/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

export const BackgroundJobsManager: React.FC = () => {
  const [schedules, setSchedules] = useState([]);
  const [jobHistory, setJobHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningJobs, setRunningJobs] = useState(new Set<string>());

  const jobService = BackgroundJobService.getInstance();

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const activeSchedules = jobService.getActiveSchedules();
      setSchedules(activeSchedules);

      const history = await jobService.getJobHistory();
      setJobHistory(history);
    } catch (error) {
      console.error('Failed to load job data:', error);
    }
  };

  const handleRunJob = async (jobId: string) => {
    setRunningJobs(prev => new Set(prev).add(jobId));
    
    try {
      let result;
      if (jobId === 'popularity-aggregation') {
        result = await jobService.runPopularityAggregation();
      } else if (jobId === 'price-snapshots') {
        result = await jobService.runPriceSnapshots();
      }

      if (result?.success) {
        toast({
          title: 'Job Completed',
          description: `${jobId} completed successfully`
        });
      } else {
        toast({
          title: 'Job Failed',
          description: result?.error || 'Unknown error',
          variant: 'destructive'
        });
      }

      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run job',
        variant: 'destructive'
      });
    } finally {
      setRunningJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleToggleJob = (jobId: string, enabled: boolean) => {
    jobService.setJobEnabled(jobId, enabled);
    loadData();
    
    toast({
      title: enabled ? 'Job Enabled' : 'Job Disabled',
      description: `${jobId} has been ${enabled ? 'enabled' : 'disabled'}`
    });
  };

  const getJobStatus = (jobName: string) => {
    const recentJob = jobHistory.find(j => j.job_name === jobName);
    if (!recentJob) return null;

    const isRecent = new Date(recentJob.completed_at || recentJob.started_at) > 
      new Date(Date.now() - 5 * 60 * 1000); // Within last 5 minutes

    return {
      status: recentJob.status,
      isRecent,
      time: recentJob.completed_at || recentJob.started_at
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Background Jobs</h2>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules.map(schedule => {
              const status = getJobStatus(schedule.jobId);
              const isRunning = runningJobs.has(schedule.jobId);

              return (
                <div
                  key={schedule.jobId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{schedule.name}</h4>
                      {status && status.isRecent && (
                        <Badge 
                          variant={status.status === 'completed' ? 'success' : 'destructive'}
                        >
                          {status.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Runs every {schedule.interval / (60 * 60 * 1000)} hours
                    </p>
                    {status && (
                      <p className="text-xs text-muted-foreground">
                        Last run: {formatDistanceToNow(new Date(status.time), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(enabled) => handleToggleJob(schedule.jobId, enabled)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunJob(schedule.jobId)}
                      disabled={isRunning || !schedule.enabled}
                    >
                      {isRunning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No job history available
                  </TableCell>
                </TableRow>
              ) : (
                jobHistory.map(job => {
                  const duration = job.completed_at
                    ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
                    : null;

                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.job_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {job.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : job.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}
                          <span className="capitalize">{job.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(job.started_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        {duration ? `${Math.round(duration / 1000)}s` : '-'}
                      </TableCell>
                      <TableCell>
                        {job.error_message && (
                          <span className="text-sm text-destructive">
                            {job.error_message}
                          </span>
                        )}
                        {job.metadata?.items_processed && (
                          <span className="text-sm text-muted-foreground">
                            {job.metadata.items_processed} items
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

### Step 6: Create Database Tables

**File**: `supabase/migrations/20250713_add_background_job_tables.sql`

```sql
-- Price snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_rates JSONB NOT NULL DEFAULT '{}',
  item_prices JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background job logs
CREATE TABLE IF NOT EXISTS background_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_price_snapshots_project_date ON price_snapshots(project_id, snapshot_date DESC);
CREATE INDEX idx_background_job_logs_job_name ON background_job_logs(job_name, started_at DESC);
CREATE INDEX idx_background_job_logs_status ON background_job_logs(status);
CREATE INDEX idx_library_item_popularity_score ON library_item_popularity(popularity_score DESC);

-- RLS
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_job_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their project snapshots"
  ON price_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = price_snapshots.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage job logs"
  ON background_job_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean old job logs
CREATE OR REPLACE FUNCTION clean_old_job_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM background_job_logs
  WHERE started_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### Step 7: Deploy Edge Functions

Create deployment script:

**File**: `scripts/deploy-edge-functions.sh`

```bash
#!/bin/bash

# Deploy edge functions to Supabase

echo "Deploying edge functions..."

# Deploy popularity aggregation
supabase functions deploy aggregate-library-popularity \
  --no-verify-jwt

# Deploy price snapshot
supabase functions deploy capture-price-snapshot \
  --no-verify-jwt

# Deploy complex calculations
supabase functions deploy calculate-complex-factors \
  --no-verify-jwt

echo "Edge functions deployed successfully!"

# Set up scheduled jobs (using pg_cron if available)
echo "Setting up scheduled jobs..."

supabase db push << EOF
-- Schedule popularity aggregation (daily at 2 AM)
SELECT cron.schedule(
  'aggregate-library-popularity',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/aggregate-library-popularity',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_ANON_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Schedule price snapshots (weekly on Sunday at 3 AM)
SELECT cron.schedule(
  'capture-price-snapshots',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/capture-price-snapshot',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_ANON_KEY',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('projectId', projects.id)
  )
  FROM projects
  WHERE is_active = true;
  $$
);
EOF

echo "Scheduled jobs configured!"
```

## Testing Guidelines

### Unit Tests

Create test file: `src/features/library/services/__tests__/backgroundJobService.test.ts`

```typescript
import { BackgroundJobService } from '../backgroundJobService';
import { createClient } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');

describe('BackgroundJobService', () => {
  let service: BackgroundJobService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.useFakeTimers();
    
    mockSupabase = {
      functions: {
        invoke: jest.fn()
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = BackgroundJobService.getInstance();
  });

  afterEach(() => {
    service.stopAllJobs();
    jest.useRealTimers();
  });

  describe('runPopularityAggregation', () => {
    it('should invoke edge function successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, processed: 10 },
        error: null
      });

      const result = await service.runPopularityAggregation();

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'aggregate-library-popularity'
      );
      expect(result.success).toBe(true);
      expect(result.data.processed).toBe(10);
    });

    it('should handle edge function errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Function failed')
      });

      const result = await service.runPopularityAggregation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Function failed');
    });
  });

  describe('schedulePopularityAggregation', () => {
    it('should schedule job with correct interval', () => {
      const runSpy = jest.spyOn(service, 'runPopularityAggregation')
        .mockResolvedValue({ success: true, executedAt: new Date() });

      service.schedulePopularityAggregation(1); // 1 hour

      // Fast-forward 1 hour
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(runSpy).toHaveBeenCalledTimes(2); // Once immediately, once after interval
    });
  });
});
```

### Manual Testing Checklist

1. **Edge Function Deployment**
   - [ ] All functions deploy successfully
   - [ ] Functions accessible via Supabase dashboard
   - [ ] Function logs visible

2. **Popularity Aggregation**
   - [ ] Manual execution works
   - [ ] Popularity scores update correctly
   - [ ] Old data cleaned up
   - [ ] Job logs created

3. **Price Snapshots**
   - [ ] Captures all project data
   - [ ] Calculations are accurate
   - [ ] Snapshots stored correctly
   - [ ] Historical data preserved

4. **Complex Calculations**
   - [ ] Handles multiple items
   - [ ] Optional costs calculated correctly
   - [ ] Performance acceptable for large batches

5. **Job Scheduling**
   - [ ] Jobs run at scheduled intervals
   - [ ] Enable/disable functionality works
   - [ ] Job history displays correctly

## Performance Optimization

### Edge Function Optimization

1. **Batch Processing**
   ```typescript
   // Process items the batch to avoid timeouts
   const BATCH_SIZE = 100;
   for (let i = 0; i < items.length; i += BATCH_SIZE) {
     const batch = items.slice(i, i + BATCH_SIZE);
     await processBatch(batch);
   }
   ```

2. **Parallel Processing**
   ```typescript
   // Process independent calculations in parallel
   const results = await Promise.all(
     items.map(item => calculateItemCost(item))
   );
   ```

3. **Caching**
   - Cache project rates
   - Cache catalog item prices
   - Use database indexes effectively

### Monitoring

1. **Add Performance Metrics**
   ```typescript
   const startTime = Date.now();
   // ... processing ...
   const duration = Date.now() - startTime;
   
   await logMetric('job_duration', duration, { job_name: 'popularity' });
   ```

2. **Error Tracking**
   - Log all errors with context
   - Set up alerts for repeated failures
   - Monitor job queue length

## Deployment Checklist

1. **Pre-deployment**
   - [ ] Create edge function directories
   - [ ] Test functions locally
   - [ ] Create database tables

2. **Deployment**
   - [ ] Deploy edge functions
   - [ ] Run database migrations
   - [ ] Deploy service code
   - [ ] Initialize job schedules

3. **Post-deployment**
   - [ ] Verify functions are accessible
   - [ ] Test manual job execution
   - [ ] Monitor first scheduled runs
   - [ ] Check job logs

## Next Steps

After completing this phase:

1. Proceed to [Phase 4: Advanced UI Components](./04-ADVANCED-UI-COMPONENTS.md)
2. Set up monitoring dashboards
3. Configure alerts for job failures
4. Document job schedules for operations team

## Common Issues & Solutions

### Issue 1: Edge function timeout
**Solution**: Reduce batch size or implement pagination

### Issue 2: Jobs not running on schedule
**Solution**: Check pg_cron installation and configuration

### Issue 3: High memory usage
**Solution**: Process data in streams rather than loading all at once

---

*Phase 3 Complete: Background jobs and edge functions are now operational*