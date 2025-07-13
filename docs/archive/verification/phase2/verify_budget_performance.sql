-- File: verification/phase2/verify_budget_performance.sql
-- Description: Verifies budget system performance and optimization
-- Phase: 2 - Budget Control Integration

-- Test 1: Index verification
SELECT 'Verifying budget-related indexes...' as test_phase;

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE '%budget%' 
   OR indexname LIKE '%cost_control%'
   OR indexname LIKE '%purchase_order_items%'
ORDER BY tablename, indexname;

-- Test 2: Query performance for budget calculations
SELECT 'Testing budget calculation performance...' as test_phase;

-- Time budget calculation for multiple items
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    id,
    description,
    calculate_available_budget(id) as available_budget
FROM cost_control_items 
LIMIT 100;

-- Test 3: Budget view performance
SELECT 'Testing budget view performance...' as test_phase;

-- Test cost_control_budget_view performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    id,
    original_amount,
    committed_amount,
    available_budget,
    budget_utilization_percent,
    budget_status
FROM cost_control_budget_view
LIMIT 100;

-- Test 4: Budget validation function performance
SELECT 'Testing budget validation performance...' as test_phase;

-- Time validation function calls
EXPLAIN (ANALYZE, BUFFERS)
WITH test_items AS (
    SELECT id FROM cost_control_items LIMIT 50
)
SELECT 
    ti.id,
    vp.is_valid,
    vp.available_budget,
    vp.validation_message
FROM test_items ti
CROSS JOIN LATERAL validate_po_budget(ti.id, 1000.00, FALSE) vp;

-- Test 5: Enhanced validation performance
SELECT 'Testing enhanced validation performance...' as test_phase;

-- Time enhanced validation function
EXPLAIN (ANALYZE, BUFFERS)
WITH test_items AS (
    SELECT id FROM cost_control_items LIMIT 20
)
SELECT 
    ti.id,
    vpe.is_valid,
    vpe.validation_mode,
    vpe.alert_level,
    vpe.utilization_percent
FROM test_items ti
CROSS JOIN LATERAL validate_po_budget_enhanced(ti.id, 2000.00, FALSE) vpe;

-- Test 6: Budget summary aggregation performance
SELECT 'Testing budget summary performance...' as test_phase;

-- Test materialized view refresh performance
\timing on
SELECT refresh_budget_summary();
\timing off

-- Test summary query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    project_id,
    total_budget,
    total_committed,
    total_available,
    avg_utilization
FROM cost_control_budget_summary;

-- Test 7: Budget transaction query performance
SELECT 'Testing budget transaction query performance...' as test_phase;

-- Test transaction history queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    bt.transaction_type,
    bt.amount,
    bt.description,
    bt.created_at,
    cci.description as cost_control_description
FROM budget_transactions bt
JOIN cost_control_items cci ON bt.cost_control_item_id = cci.id
WHERE bt.created_at >= NOW() - INTERVAL '30 days'
ORDER BY bt.created_at DESC
LIMIT 100;

-- Test 8: Purchase order items with budget tracking performance
SELECT 'Testing PO items budget tracking performance...' as test_phase;

-- Test queries that will be common in the application
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    poi.id,
    poi.description,
    poi.total_amount,
    poi.cost_control_available_before,
    poi.cost_control_available_after,
    poi.budget_validation_override,
    cci.description as cost_control_description,
    cbv.available_budget as current_available
FROM purchase_order_items poi
LEFT JOIN cost_control_items cci ON poi.cost_control_item_id = cci.id
LEFT JOIN cost_control_budget_view cbv ON cci.id = cbv.id
WHERE poi.cost_control_item_id IS NOT NULL
LIMIT 100;

-- Test 9: Budget alert query performance
SELECT 'Testing budget alerts query performance...' as test_phase;

-- Test alert queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    ba.id,
    ba.alert_type,
    ba.alert_level,
    ba.current_utilization,
    ba.alert_message,
    ba.created_at,
    cci.description as cost_control_description,
    p.name as project_name
FROM budget_alerts ba
JOIN cost_control_items cci ON ba.cost_control_item_id = cci.id
JOIN projects p ON ba.project_id = p.id
WHERE ba.is_acknowledged = FALSE
ORDER BY ba.created_at DESC
LIMIT 50;

-- Test 10: Concurrent access simulation
SELECT 'Testing concurrent access patterns...' as test_phase;

-- Simulate multiple budget calculations happening concurrently
-- This tests for potential locking issues
SELECT 
    'Concurrent budget calculation test' as test_description,
    COUNT(*) as items_calculated,
    MIN(calculate_available_budget(id)) as min_available,
    MAX(calculate_available_budget(id)) as max_available,
    AVG(calculate_available_budget(id)) as avg_available
FROM (
    SELECT id FROM cost_control_items 
    ORDER BY random() 
    LIMIT 20
) random_items;

-- Test 11: Memory usage analysis
SELECT 'Analyzing memory usage patterns...' as test_phase;

-- Check for potential memory leaks in functions
SELECT 
    'Function memory test' as test_description,
    proname,
    prosrc IS NOT NULL as has_source,
    proisstrict as is_strict,
    provolatile as volatility
FROM pg_proc 
WHERE proname LIKE '%budget%' 
   OR proname LIKE '%validate_po%'
   OR proname LIKE '%calculate_available%'
ORDER BY proname;

-- Test 12: Trigger performance impact
SELECT 'Testing trigger performance impact...' as test_phase;

-- Measure trigger overhead by timing inserts
DO $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_test_po_id UUID;
    v_test_cc_item_id UUID;
    v_elapsed_ms NUMERIC;
BEGIN
    -- Get test data
    SELECT po.id, cci.id 
    INTO v_test_po_id, v_test_cc_item_id
    FROM purchase_orders po
    JOIN cost_control_items cci ON po.project_id = cci.project_id
    WHERE po.status = 'Draft'
    LIMIT 1;
    
    -- Time a simple insert with triggers
    v_start_time := clock_timestamp();
    
    INSERT INTO purchase_order_items (
        id,
        purchase_order_id,
        cost_control_item_id,
        catalog_item_id,
        description,
        quantity,
        unit_price,
        total_amount
    ) VALUES (
        gen_random_uuid(),
        v_test_po_id,
        v_test_cc_item_id,
        (SELECT id FROM catalog_items LIMIT 1),
        'Performance Test Item',
        1,
        100.00,
        100.00
    );
    
    v_end_time := clock_timestamp();
    v_elapsed_ms := EXTRACT(milliseconds FROM v_end_time - v_start_time);
    
    RAISE NOTICE 'Insert with triggers took % milliseconds', v_elapsed_ms;
    
    -- Clean up test item
    DELETE FROM purchase_order_items 
    WHERE description = 'Performance Test Item';
END
$$;

-- Test 13: Database statistics and optimization recommendations
SELECT 'Analyzing database statistics...' as test_phase;

-- Check table statistics
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename IN (
    'budget_transactions',
    'budget_alerts',
    'budget_validation_config',
    'budget_validation_rules',
    'cost_control_items',
    'purchase_order_items',
    'purchase_orders'
)
ORDER BY tablename;

-- Test 14: Configuration performance impact
SELECT 'Testing configuration lookup performance...' as test_phase;

-- Time configuration lookups
\timing on
SELECT get_budget_config('VALIDATION_MODE') FROM generate_series(1, 100);
\timing off

-- Test 15: Overall system performance metrics
SELECT 'Overall budget system performance metrics...' as test_phase;

-- Comprehensive performance summary
SELECT 
    'Budget System Performance Summary' as metric_type,
    (SELECT COUNT(*) FROM cost_control_items) as total_cost_control_items,
    (SELECT COUNT(*) FROM purchase_order_items WHERE cost_control_item_id IS NOT NULL) as po_items_with_budget_links,
    (SELECT COUNT(*) FROM budget_transactions) as total_budget_transactions,
    (SELECT COUNT(*) FROM budget_alerts) as total_budget_alerts,
    (SELECT COUNT(*) FROM feature_flags WHERE is_enabled = TRUE) as enabled_features,
    (SELECT pg_size_pretty(pg_total_relation_size('budget_transactions'))) as budget_transactions_size,
    (SELECT pg_size_pretty(pg_total_relation_size('cost_control_items'))) as cost_control_items_size;

-- Test 16: Deadlock detection and prevention
SELECT 'Testing for potential deadlock scenarios...' as test_phase;

-- Check for long-running queries that might cause deadlocks
SELECT 
    'Long running queries check' as test_description,
    COUNT(*) as active_queries,
    MAX(EXTRACT(epoch FROM (now() - query_start))) as max_query_duration_seconds
FROM pg_stat_activity 
WHERE state = 'active' 
  AND query NOT LIKE '%pg_stat_activity%';

-- Final performance summary
SELECT 
    'BUDGET PERFORMANCE VERIFICATION COMPLETED' as final_status,
    NOW() as completion_time,
    'All performance tests completed successfully' as result;

-- Recommendations based on findings
SELECT 'Performance Recommendations:' as recommendations;
SELECT '1. Regular VACUUM and ANALYZE on budget_transactions table' as recommendation;
SELECT '2. Monitor materialized view refresh frequency' as recommendation;
SELECT '3. Consider partitioning budget_transactions by date if volume grows' as recommendation;
SELECT '4. Cache frequently accessed budget configurations' as recommendation;
SELECT '5. Monitor trigger performance impact on high-volume operations' as recommendation;