import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const { events } = await request.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 }
      );
    }

    // Store events in database
    const { error } = await supabase
      .from('user_behavior_events')
      .insert(
        events.map(event => ({
          id: event.id,
          user_id: event.userId !== 'anonymous' ? event.userId : null,
          session_id: event.sessionId,
          event_type: event.eventType,
          event_data: event.eventData,
          timestamp: event.timestamp,
          user_agent: event.userAgent,
          device_type: event.deviceType,
        }))
      );

    if (error) {
      console.error('Failed to store user behavior events:', error);
      return NextResponse.json(
        { error: 'Failed to store events' },
        { status: 500 }
      );
    }

    // Process events for real-time analytics
    await processEventsForAnalytics(events, supabase);

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error) {
    console.error('Error processing user behavior events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processEventsForAnalytics(events: any[], supabase: any) {
  try {
    for (const event of events) {
      // Process specific event types for analytics
      switch (event.eventType) {
        case 'search':
          await processSearchEvent(event, supabase);
          break;
        case 'selection':
          await processSelectionEvent(event, supabase);
          break;
        case 'completion':
          await processCompletionEvent(event, supabase);
          break;
        case 'error':
          await processErrorEvent(event, supabase);
          break;
      }
    }
  } catch (error) {
    console.error('Error processing events for analytics:', error);
  }
}

async function processSearchEvent(event: any, supabase: any) {
  const { searchTerm, searchResults, responseTime } = event.eventData;
  
  if (searchTerm && event.eventData.context === 'library_search') {
    // Update search analytics
    await supabase
      .from('search_analytics')
      .upsert({
        search_term: searchTerm.toLowerCase(),
        search_count: 1,
        avg_response_time: responseTime,
        avg_results_count: searchResults,
        last_searched_at: event.timestamp,
      }, {
        onConflict: 'search_term',
        ignoreDuplicates: false
      });
  }
}

async function processSelectionEvent(event: any, supabase: any) {
  const { itemId, timeToSelect } = event.eventData;
  
  if (itemId && event.eventData.context === 'library_item_selection') {
    // Update item popularity
    await supabase.rpc('increment_item_usage', {
      item_id: itemId,
      selection_time: timeToSelect
    });
  }
}

async function processCompletionEvent(event: any, supabase: any) {
  const { context } = event.eventData;
  
  switch (context) {
    case 'bulk_operation':
      await processBulkOperationCompletion(event, supabase);
      break;
    case 'estimate_creation':
      await processEstimateCreationCompletion(event, supabase);
      break;
    case 'feature_usage':
      await processFeatureUsageCompletion(event, supabase);
      break;
  }
}

async function processBulkOperationCompletion(event: any, supabase: any) {
  const { operationType, itemCount, completionTime, success } = event.eventData;
  
  // Store bulk operation metrics
  await supabase
    .from('operation_metrics')
    .insert({
      user_id: event.userId !== 'anonymous' ? event.userId : null,
      operation_type: operationType,
      item_count: itemCount,
      completion_time: completionTime,
      success: success,
      timestamp: event.timestamp,
    });
}

async function processEstimateCreationCompletion(event: any, supabase: any) {
  const { elementCount, totalTime, libraryItemsUsed, efficiency } = event.eventData;
  
  // Store estimate creation metrics
  await supabase
    .from('estimate_metrics')
    .insert({
      user_id: event.userId !== 'anonymous' ? event.userId : null,
      element_count: elementCount,
      total_time: totalTime,
      library_items_used: libraryItemsUsed,
      efficiency_score: efficiency,
      timestamp: event.timestamp,
    });
}

async function processFeatureUsageCompletion(event: any, supabase: any) {
  const { featureName, usageDuration, interactionCount } = event.eventData;
  
  // Update feature usage analytics
  await supabase
    .from('feature_analytics')
    .upsert({
      feature_name: featureName,
      total_usage_time: usageDuration,
      usage_count: 1,
      avg_interaction_count: interactionCount || 0,
      last_used_at: event.timestamp,
    }, {
      onConflict: 'feature_name',
      ignoreDuplicates: false
    });
}

async function processErrorEvent(event: any, supabase: any) {
  const { errorType, errorMessage, errorContext } = event.eventData;
  
  // Store error for analysis
  await supabase
    .from('error_analytics')
    .insert({
      user_id: event.userId !== 'anonymous' ? event.userId : null,
      session_id: event.sessionId,
      error_type: errorType,
      error_message: errorMessage,
      error_context: errorContext,
      timestamp: event.timestamp,
    });
}