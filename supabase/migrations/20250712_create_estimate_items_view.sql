-- Create estimate_items_view
-- This view combines estimate structures, elements, and detail items into a unified view
CREATE OR REPLACE VIEW estimate_items_view AS
SELECT 
    s.id,
    s.name,
    s.amount,
    0 AS level,
    NULL::uuid AS parent_id,
    s.order_index AS "order",
    s.project_id,
    s.created_at,
    s.updated_at,
    NULL::numeric AS quantity,
    NULL::text AS unit,
    NULL::numeric AS rate,
    NULL::jsonb AS factor_breakdown,
    NULL::uuid AS library_item_id,
    NULL::boolean AS is_from_library
FROM estimate_structures s

UNION ALL

SELECT 
    e.id,
    e.name,
    e.amount,
    1 AS level,
    e.structure_id AS parent_id,
    e.order_index AS "order",
    e.project_id,
    e.created_at,
    e.updated_at,
    NULL::numeric AS quantity,
    NULL::text AS unit,
    NULL::numeric AS rate,
    NULL::jsonb AS factor_breakdown,
    NULL::uuid AS library_item_id,
    NULL::boolean AS is_from_library
FROM estimate_elements e

UNION ALL

SELECT 
    d.id,
    d.name,
    d.amount,
    2 AS level,
    d.element_id AS parent_id,
    d.order_index AS "order",
    d.project_id,
    d.created_at,
    d.updated_at,
    d.quantity,
    d.unit,
    d.rate,
    d.factor_breakdown,
    d.library_item_id,
    d.is_from_library
FROM estimate_detail_items d;