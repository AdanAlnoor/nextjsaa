-- File: verification/phase1/verify_performance_impact.sql
-- Description: Verifies that new tables don't impact existing query performance

\echo 'Starting Phase 1 Performance Impact Assessment...'

-- Time existing purchase order queries
\timing on

-- Test 1: Basic PO query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT po.*, poi.* 
FROM purchase_orders po
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
LIMIT 100;

-- Test 2: PO creation performance (if test data exists)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM purchase_orders 
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;

-- Test 3: Check for any unexpected table locks
SELECT 
  l.locktype,
  l.database,
  l.relation::regclass,
  l.page,
  l.tuple,
  l.virtualxid,
  l.transactionid,
  l.mode,
  l.granted
FROM pg_locks l
WHERE l.relation::regclass::text LIKE '%purchase_order%' 
   OR l.relation::regclass::text LIKE '%catalog%'
   OR l.relation::regclass::text LIKE '%budget%';

-- Test 4: Verify index usage on new tables
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM catalog_items WHERE is_active = true LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM item_categories WHERE is_active = true LIMIT 10;

\timing off

\echo 'Phase 1 Performance Impact Assessment Complete'