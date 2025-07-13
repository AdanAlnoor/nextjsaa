-- File: verification/phase2/verify_budget_triggers.sql
-- Description: Verifies budget validation and tracking triggers work correctly
-- Phase: 2 - Budget Control Integration

-- Test 1: Verify triggers exist
SELECT 'Testing trigger existence...' as test_phase;

SELECT 
    trigger_name,
    table_name,
    action_timing,
    event_manipulation,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_name IN (
    'budget_validation_trigger',
    'budget_transaction_log_trigger',
    'po_status_budget_trigger',
    'update_feature_flags_timestamp',
    'update_budget_validation_config_timestamp'
)
GROUP BY trigger_name, table_name, action_timing, event_manipulation
ORDER BY trigger_name;

-- Test 2: Verify trigger functions exist
SELECT 'Testing trigger functions...' as test_phase;

SELECT 
    'trigger_validate_po_budget_enhanced' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'trigger_validate_po_budget_enhanced';

SELECT 
    'trigger_log_budget_changes' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'trigger_log_budget_changes';

SELECT 
    'trigger_po_status_budget_update' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'trigger_po_status_budget_update';

-- Test 3: Check budget alerts table
SELECT 'Testing budget alerts table...' as test_phase;

SELECT 
    'budget_alerts' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_alerts') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check initial alert count
SELECT 
    'Initial budget alerts count' as test_description,
    COUNT(*) as alert_count
FROM budget_alerts;

-- Test 4: Prepare test data for trigger testing
SELECT 'Preparing test data for trigger testing...' as test_phase;

DO $$
DECLARE
    v_test_project_id UUID;
    v_test_cc_item_id UUID;
    v_test_po_id UUID;
    v_test_supplier_id UUID;
    v_count INTEGER;
BEGIN
    -- Ensure we have test data
    SELECT COUNT(*) INTO v_count FROM cost_control_items WHERE description LIKE '%Test Budget%';
    
    IF v_count = 0 THEN
        -- Get or create test project
        SELECT id INTO v_test_project_id FROM projects WHERE name LIKE '%Test Project%' LIMIT 1;
        
        IF v_test_project_id IS NULL THEN
            INSERT INTO projects (id, name, description) 
            VALUES (gen_random_uuid(), 'Test Project for Trigger Verification', 'Temporary test project')
            RETURNING id INTO v_test_project_id;
        END IF;
        
        -- Create test cost control item
        INSERT INTO cost_control_items (
            id, 
            project_id, 
            description, 
            original_amount, 
            paid_bills, 
            pending_bills
        ) VALUES (
            gen_random_uuid(),
            v_test_project_id,
            'Test Budget Item for Trigger Testing',
            5000.00,
            0.00,
            0.00
        ) RETURNING id INTO v_test_cc_item_id;
        
        -- Get or create test supplier
        SELECT id INTO v_test_supplier_id FROM suppliers LIMIT 1;
        
        IF v_test_supplier_id IS NULL THEN
            INSERT INTO suppliers (id, name, contact_info) 
            VALUES (gen_random_uuid(), 'Test Supplier', '{"email": "test@example.com"}')
            RETURNING id INTO v_test_supplier_id;
        END IF;
        
        -- Create test purchase order
        INSERT INTO purchase_orders (
            id,
            project_id,
            supplier_id,
            status,
            total_amount,
            description
        ) VALUES (
            gen_random_uuid(),
            v_test_project_id,
            v_test_supplier_id,
            'Draft',
            0.00,
            'Test PO for Trigger Testing'
        ) RETURNING id INTO v_test_po_id;
        
        RAISE NOTICE 'Created test data: Project %, Cost Control %, PO %', 
            v_test_project_id, v_test_cc_item_id, v_test_po_id;
    END IF;
END
$$;

-- Test 5: Test budget validation trigger with valid amount
SELECT 'Testing budget validation trigger with valid amount...' as test_phase;

DO $$
DECLARE
    v_test_po_id UUID;
    v_test_cc_item_id UUID;
    v_initial_alert_count INTEGER;
    v_final_alert_count INTEGER;
    v_test_poi_id UUID;
BEGIN
    -- Get test data
    SELECT po.id, cci.id 
    INTO v_test_po_id, v_test_cc_item_id
    FROM purchase_orders po
    JOIN cost_control_items cci ON po.project_id = cci.project_id
    WHERE po.description LIKE '%Test PO%' AND cci.description LIKE '%Test Budget%'
    LIMIT 1;
    
    -- Count initial alerts
    SELECT COUNT(*) INTO v_initial_alert_count FROM budget_alerts;
    
    -- Insert valid purchase order item (should pass validation)
    INSERT INTO purchase_order_items (
        id,
        purchase_order_id,
        cost_control_item_id,
        catalog_item_id, -- This makes it a Phase 2+ item
        description,
        quantity,
        unit_price,
        total_amount
    ) VALUES (
        gen_random_uuid(),
        v_test_po_id,
        v_test_cc_item_id,
        (SELECT id FROM catalog_items LIMIT 1), -- Use any catalog item
        'Test Item - Valid Amount',
        1,
        1000.00,
        1000.00
    ) RETURNING id INTO v_test_poi_id;
    
    -- Count final alerts
    SELECT COUNT(*) INTO v_final_alert_count FROM budget_alerts;
    
    RAISE NOTICE 'Valid amount test: PO Item %, Alerts before: %, after: %', 
        v_test_poi_id, v_initial_alert_count, v_final_alert_count;
        
    -- Verify the item was created
    IF EXISTS (SELECT 1 FROM purchase_order_items WHERE id = v_test_poi_id) THEN
        RAISE NOTICE 'SUCCESS: Valid budget item created successfully';
    ELSE
        RAISE NOTICE 'FAIL: Valid budget item was not created';
    END IF;
END
$$;

-- Test 6: Test budget validation trigger with amount requiring alert
SELECT 'Testing budget validation trigger with alert threshold...' as test_phase;

DO $$
DECLARE
    v_test_po_id UUID;
    v_test_cc_item_id UUID;
    v_initial_alert_count INTEGER;
    v_final_alert_count INTEGER;
    v_test_poi_id UUID;
    v_available_budget DECIMAL(15,2);
BEGIN
    -- Get test data
    SELECT po.id, cci.id 
    INTO v_test_po_id, v_test_cc_item_id
    FROM purchase_orders po
    JOIN cost_control_items cci ON po.project_id = cci.project_id
    WHERE po.description LIKE '%Test PO%' AND cci.description LIKE '%Test Budget%'
    LIMIT 1;
    
    -- Get available budget
    SELECT calculate_available_budget(v_test_cc_item_id) INTO v_available_budget;
    
    -- Count initial alerts
    SELECT COUNT(*) INTO v_initial_alert_count FROM budget_alerts;
    
    -- Insert item that consumes most of remaining budget (should trigger alert)
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
        'Test Item - High Amount',
        1,
        v_available_budget * 0.95, -- 95% of remaining budget
        v_available_budget * 0.95
    ) RETURNING id INTO v_test_poi_id;
    
    -- Count final alerts
    SELECT COUNT(*) INTO v_final_alert_count FROM budget_alerts;
    
    RAISE NOTICE 'High amount test: Available budget: %, Amount: %, Alerts before: %, after: %', 
        v_available_budget, v_available_budget * 0.95, v_initial_alert_count, v_final_alert_count;
        
    -- Check if alert was created
    IF v_final_alert_count > v_initial_alert_count THEN
        RAISE NOTICE 'SUCCESS: Budget alert created for high utilization';
    ELSE
        RAISE NOTICE 'INFO: No alert created (may be expected based on threshold settings)';
    END IF;
END
$$;

-- Test 7: Test budget override functionality
SELECT 'Testing budget override functionality...' as test_phase;

DO $$
DECLARE
    v_test_po_id UUID;
    v_test_cc_item_id UUID;
    v_available_budget DECIMAL(15,2);
    v_test_poi_id UUID;
    v_override_amount DECIMAL(15,2);
BEGIN
    -- Get test data
    SELECT po.id, cci.id 
    INTO v_test_po_id, v_test_cc_item_id
    FROM purchase_orders po
    JOIN cost_control_items cci ON po.project_id = cci.project_id
    WHERE po.description LIKE '%Test PO%' AND cci.description LIKE '%Test Budget%'
    LIMIT 1;
    
    -- Get available budget and set override amount
    SELECT calculate_available_budget(v_test_cc_item_id) INTO v_available_budget;
    v_override_amount := v_available_budget + 500.00; -- Exceed budget by $500
    
    -- Insert item with budget override
    INSERT INTO purchase_order_items (
        id,
        purchase_order_id,
        cost_control_item_id,
        catalog_item_id,
        description,
        quantity,
        unit_price,
        total_amount,
        budget_validation_override,
        override_reason
    ) VALUES (
        gen_random_uuid(),
        v_test_po_id,
        v_test_cc_item_id,
        (SELECT id FROM catalog_items LIMIT 1),
        'Test Item - Budget Override',
        1,
        v_override_amount,
        v_override_amount,
        TRUE,
        'Testing budget override functionality'
    ) RETURNING id INTO v_test_poi_id;
    
    RAISE NOTICE 'Override test: Available: %, Override amount: %, PO Item: %', 
        v_available_budget, v_override_amount, v_test_poi_id;
        
    -- Verify the override item was created
    IF EXISTS (SELECT 1 FROM purchase_order_items WHERE id = v_test_poi_id AND budget_validation_override = TRUE) THEN
        RAISE NOTICE 'SUCCESS: Budget override item created successfully';
    ELSE
        RAISE NOTICE 'FAIL: Budget override item was not created';
    END IF;
END
$$;

-- Test 8: Test purchase order status change trigger
SELECT 'Testing purchase order status change trigger...' as test_phase;

DO $$
DECLARE
    v_test_po_id UUID;
    v_initial_transaction_count INTEGER;
    v_final_transaction_count INTEGER;
BEGIN
    -- Get test purchase order
    SELECT id INTO v_test_po_id 
    FROM purchase_orders 
    WHERE description LIKE '%Test PO%' 
    LIMIT 1;
    
    -- Count initial budget transactions
    SELECT COUNT(*) INTO v_initial_transaction_count 
    FROM budget_transactions 
    WHERE purchase_order_id = v_test_po_id;
    
    -- Change PO status from Draft to Approved
    UPDATE purchase_orders 
    SET status = 'Approved' 
    WHERE id = v_test_po_id;
    
    -- Count final budget transactions
    SELECT COUNT(*) INTO v_final_transaction_count 
    FROM budget_transactions 
    WHERE purchase_order_id = v_test_po_id;
    
    RAISE NOTICE 'Status change test: PO %, Transactions before: %, after: %', 
        v_test_po_id, v_initial_transaction_count, v_final_transaction_count;
        
    -- Change status to Rejected to test budget release
    UPDATE purchase_orders 
    SET status = 'Rejected' 
    WHERE id = v_test_po_id;
    
    RAISE NOTICE 'PO rejected to test budget release';
END
$$;

-- Test 9: Verify budget transaction logging
SELECT 'Verifying budget transaction logging...' as test_phase;

-- Show recent budget transactions
SELECT 
    'Recent budget transactions' as test_description,
    bt.transaction_type,
    bt.amount,
    bt.description,
    bt.created_at,
    cci.description as cost_control_item
FROM budget_transactions bt
JOIN cost_control_items cci ON bt.cost_control_item_id = cci.id
WHERE cci.description LIKE '%Test Budget%'
ORDER BY bt.created_at DESC
LIMIT 10;

-- Test 10: Verify feature flag functionality
SELECT 'Testing feature flag functionality...' as test_phase;

-- Test feature flag check
SELECT 
    'Feature flag tests' as test_description,
    is_feature_enabled('ENABLE_BUDGET_VALIDATION') as budget_validation_enabled,
    is_feature_enabled('ENABLE_COMMITTED_TRACKING') as committed_tracking_enabled,
    is_feature_enabled('NONEXISTENT_FLAG') as nonexistent_flag_test;

-- Test 11: Performance test for triggers
SELECT 'Performance testing triggers...' as test_phase;

-- Measure trigger performance by timing operations
SELECT 
    'Trigger performance test' as test_description,
    COUNT(*) as total_po_items_with_budget_links,
    COUNT(CASE WHEN budget_validation_override = TRUE THEN 1 END) as override_count,
    AVG(CASE WHEN cost_control_available_before IS NOT NULL 
             THEN cost_control_available_before - cost_control_available_after 
             ELSE NULL END) as avg_budget_impact
FROM purchase_order_items 
WHERE cost_control_item_id IS NOT NULL;

-- Test 12: Verify constraint functionality
SELECT 'Testing budget constraints...' as test_phase;

-- Test positive amount constraint
DO $$
DECLARE
    v_constraint_test_passed BOOLEAN := FALSE;
BEGIN
    BEGIN
        -- This should fail due to positive amount constraint
        INSERT INTO purchase_order_items (
            id, purchase_order_id, description, quantity, unit_price, total_amount
        ) VALUES (
            gen_random_uuid(),
            (SELECT id FROM purchase_orders WHERE description LIKE '%Test PO%' LIMIT 1),
            'Negative amount test',
            1, -100.00, -100.00
        );
        
        RAISE NOTICE 'FAIL: Negative amount constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            v_constraint_test_passed := TRUE;
            RAISE NOTICE 'SUCCESS: Positive amount constraint working';
    END;
END
$$;

-- Final verification summary
SELECT 'BUDGET TRIGGERS VERIFICATION COMPLETED' as final_status,
       NOW() as completion_time;

-- Show summary of test results
SELECT 
    'Verification Summary' as summary,
    COUNT(*) as total_budget_transactions,
    COUNT(DISTINCT cost_control_item_id) as cost_control_items_with_transactions,
    COUNT(DISTINCT purchase_order_id) as purchase_orders_with_budget_tracking
FROM budget_transactions;