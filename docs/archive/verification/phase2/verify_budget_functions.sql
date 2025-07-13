-- File: verification/phase2/verify_budget_functions.sql
-- Description: Verifies all budget calculation functions work correctly
-- Phase: 2 - Budget Control Integration

-- Test 1: Verify budget calculation functions exist
SELECT 'Testing function existence...' as test_phase;

SELECT 
    'calculate_available_budget' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'calculate_available_budget';

SELECT 
    'validate_po_budget' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'validate_po_budget';

SELECT 
    'validate_po_budget_enhanced' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'validate_po_budget_enhanced';

SELECT 
    'update_committed_amount' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'update_committed_amount';

SELECT 
    'get_budget_summary' as function_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'get_budget_summary';

-- Test 2: Verify feature flags table and functions
SELECT 'Testing feature flags...' as test_phase;

SELECT 
    'feature_flags' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    flag_name,
    is_enabled,
    description
FROM feature_flags
ORDER BY flag_name;

-- Test 3: Verify budget validation configuration
SELECT 'Testing budget validation configuration...' as test_phase;

SELECT 
    'budget_validation_config' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_validation_config') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    config_key,
    config_value,
    description
FROM budget_validation_config
ORDER BY config_key;

-- Test 4: Test budget calculation with sample data
SELECT 'Testing budget calculations with sample data...' as test_phase;

-- Create a test cost control item if none exists
DO $$
DECLARE
    v_test_project_id UUID;
    v_test_cc_item_id UUID;
    v_count INTEGER;
BEGIN
    -- Check if we have any cost control items
    SELECT COUNT(*) INTO v_count FROM cost_control_items LIMIT 1;
    
    IF v_count = 0 THEN
        -- Create a test project if none exists
        SELECT id INTO v_test_project_id FROM projects LIMIT 1;
        
        IF v_test_project_id IS NULL THEN
            INSERT INTO projects (id, name, description) 
            VALUES (gen_random_uuid(), 'Test Project for Budget Verification', 'Temporary test project')
            RETURNING id INTO v_test_project_id;
        END IF;
        
        -- Create a test cost control item
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
            'Test Budget Item for Verification',
            10000.00,
            1000.00,
            500.00
        );
        
        RAISE NOTICE 'Created test cost control item for verification';
    END IF;
END
$$;

-- Test budget calculation function
WITH test_item AS (
    SELECT id, description, original_amount, paid_bills, pending_bills
    FROM cost_control_items
    LIMIT 1
)
SELECT 
    ti.description,
    ti.original_amount,
    ti.paid_bills,
    ti.pending_bills,
    calculate_available_budget(ti.id) as calculated_available,
    (ti.original_amount - COALESCE(ti.paid_bills, 0) - COALESCE(ti.pending_bills, 0)) as expected_available,
    CASE 
        WHEN calculate_available_budget(ti.id) = (ti.original_amount - COALESCE(ti.paid_bills, 0) - COALESCE(ti.pending_bills, 0))
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as test_result
FROM test_item ti;

-- Test 5: Test budget validation function
SELECT 'Testing budget validation function...' as test_phase;

WITH test_item AS (
    SELECT id FROM cost_control_items LIMIT 1
),
validation_test AS (
    SELECT * FROM validate_po_budget(
        (SELECT id FROM test_item), 
        1000.00, 
        FALSE
    )
)
SELECT 
    'Budget validation for $1000' as test_description,
    is_valid,
    available_budget,
    required_amount,
    deficit_amount,
    validation_message
FROM validation_test;

-- Test with override
WITH test_item AS (
    SELECT id FROM cost_control_items LIMIT 1
),
override_test AS (
    SELECT * FROM validate_po_budget(
        (SELECT id FROM test_item), 
        50000.00, 
        TRUE
    )
)
SELECT 
    'Budget validation for $50000 with override' as test_description,
    is_valid,
    available_budget,
    required_amount,
    deficit_amount,
    validation_message
FROM override_test;

-- Test 6: Test enhanced budget validation
SELECT 'Testing enhanced budget validation...' as test_phase;

WITH test_item AS (
    SELECT id FROM cost_control_items LIMIT 1
),
enhanced_test AS (
    SELECT * FROM validate_po_budget_enhanced(
        (SELECT id FROM test_item), 
        5000.00, 
        FALSE
    )
)
SELECT 
    'Enhanced validation for $5000' as test_description,
    is_valid,
    validation_mode,
    available_budget,
    utilization_percent,
    alert_level,
    can_override,
    validation_message
FROM enhanced_test;

-- Test 7: Test budget summary function
SELECT 'Testing budget summary function...' as test_phase;

WITH test_item AS (
    SELECT id FROM cost_control_items LIMIT 1
),
summary_test AS (
    SELECT * FROM get_budget_summary((SELECT id FROM test_item))
)
SELECT 
    'Budget summary test' as test_description,
    original_amount,
    paid_bills,
    pending_bills,
    committed_amount,
    available_budget,
    budget_utilization_percent
FROM summary_test;

-- Test 8: Verify budget views
SELECT 'Testing budget views...' as test_phase;

SELECT 
    'cost_control_budget_view' as view_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'cost_control_budget_view') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    'cost_control_budget_summary' as materialized_view_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'cost_control_budget_summary') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Sample data from budget view
SELECT 
    'Sample budget view data' as test_description,
    COUNT(*) as total_items,
    AVG(budget_utilization_percent) as avg_utilization,
    COUNT(CASE WHEN budget_status = 'AVAILABLE' THEN 1 END) as available_items,
    COUNT(CASE WHEN budget_status = 'FULLY_COMMITTED' THEN 1 END) as fully_committed_items
FROM cost_control_budget_view;

-- Test 9: Test configuration functions
SELECT 'Testing configuration functions...' as test_phase;

SELECT 
    'get_budget_config test' as test_description,
    get_budget_config('VALIDATION_MODE', 'DEFAULT') as validation_mode,
    get_budget_config('NONEXISTENT_KEY', 'DEFAULT_VALUE') as default_test;

-- Test 10: Performance test for budget calculations
SELECT 'Performance testing budget calculations...' as test_phase;

SELECT 
    'Performance test' as test_description,
    COUNT(*) as total_cost_control_items,
    COUNT(CASE WHEN calculate_available_budget(id) >= 0 THEN 1 END) as valid_calculations,
    AVG(extract(milliseconds from clock_timestamp() - now())) as avg_calc_time_ms
FROM (
    SELECT id FROM cost_control_items LIMIT 100
) cc;

-- Final summary
SELECT 'BUDGET FUNCTIONS VERIFICATION COMPLETED' as final_status,
       NOW() as completion_time;