import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectRates {
  materials: Record<string, number>;
  labour: Record<string, number>;
  equipment: Record<string, number>;
  effective_date?: string;
}

interface ItemPriceData {
  item_code: string;
  item_name: string;
  unit: string;
  unit_price: number;
  material_cost: number;
  labor_cost: number;
  equipment_cost: number;
  total_quantity: number;
  total_cost: number;
  factor_breakdown: {
    materials: any[];
    labor: any[];
    equipment: any[];
  };
}

interface PriceSnapshot {
  project_id: string;
  snapshot_date: string;
  project_rates: ProjectRates;
  item_prices: Record<string, ItemPriceData>;
  metadata: {
    total_items: number;
    total_value: number;
    calculation_method: string;
    snapshot_version: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectId, includeAllItems = false } = await req.json()
    
    if (!projectId) {
      throw new Error('Project ID is required')
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Starting price snapshot for project: ${projectId}`)

    // Log start of job
    const { data: logEntry } = await supabaseClient
      .from('background_job_logs')
      .insert({
        job_name: 'capture-price-snapshot',
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { project_id: projectId, include_all_items: includeAllItems }
      })
      .select()
      .single()

    const jobLogId = logEntry?.id

    try {
      // Get current project rates
      const { data: projectRates, error: ratesError } = await supabaseClient
        .from('project_rates')
        .select('*')
        .eq('project_id', projectId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      if (ratesError && ratesError.code !== 'PGRST116') {
        console.error('Error fetching project rates:', ratesError)
        throw ratesError
      }

      console.log('Project rates loaded:', projectRates ? 'Found' : 'Using defaults')

      let usedItems: any[] = []

      if (includeAllItems) {
        // Get all library items for comprehensive snapshot
        const { data: allItems, error: allItemsError } = await supabaseClient
          .from('library_items')
          .select('id')
          .eq('status', 'confirmed')

        if (allItemsError) throw allItemsError

        usedItems = allItems?.map(item => ({
          library_item_id: item.id,
          quantity: 1 // Default quantity for pricing calculation
        })) || []
      } else {
        // Get library items used in this project (from estimate_element_items)
        const { data: projectItems, error: itemsError } = await supabaseClient
          .from('estimate_element_items')
          .select(`
            library_item_id,
            quantity,
            estimate_elements!inner(
              estimate_structures!inner(
                project_id
              )
            )
          `)
          .eq('estimate_elements.estimate_structures.project_id', projectId)

        if (itemsError) {
          console.error('Error fetching project items:', itemsError)
          throw itemsError
        }

        usedItems = projectItems || []
      }

      console.log(`Processing ${usedItems.length} items for price snapshot`)

      // Group by library item and sum quantities
      const itemQuantities = new Map<string, number>()
      usedItems.forEach(item => {
        if (item.library_item_id) {
          const currentQty = itemQuantities.get(item.library_item_id) || 0
          itemQuantities.set(item.library_item_id, currentQty + (item.quantity || 1))
        }
      })

      // Create price snapshot structure
      const snapshot: PriceSnapshot = {
        project_id: projectId,
        snapshot_date: new Date().toISOString(),
        project_rates: {
          materials: projectRates?.materials || {},
          labour: projectRates?.labour || {},
          equipment: projectRates?.equipment || {},
          effective_date: projectRates?.effective_date
        },
        item_prices: {},
        metadata: {
          total_items: itemQuantities.size,
          total_value: 0,
          calculation_method: includeAllItems ? 'all_library_items' : 'project_specific',
          snapshot_version: '1.0'
        }
      }

      let totalValue = 0
      let processedCount = 0

      // Calculate prices for each unique item
      for (const [itemId, totalQuantity] of itemQuantities.entries()) {
        try {
          // Get item details with factors
          const { data: item, error: itemError } = await supabaseClient
            .from('library_items')
            .select(`
              id,
              code,
              name,
              unit,
              material_factors(
                id,
                quantity_per_unit,
                wastage_percentage,
                material_catalogue_id,
                material_catalogues(code, name, unit, rate)
              ),
              labor_factors(
                id,
                hours_per_unit,
                productivity_factor,
                crew_size,
                labor_catalogue_id,
                labor_catalogues(code, name, rate)
              ),
              equipment_factors(
                id,
                hours_per_unit,
                utilization_factor,
                equipment_catalogue_id,
                equipment_catalogues(code, name, rate)
              )
            `)
            .eq('id', itemId)
            .single()

          if (itemError) {
            console.error(`Error fetching item ${itemId}:`, itemError)
            continue
          }

          if (!item) continue

          // Calculate costs based on factors and rates
          const materialCost = calculateMaterialCost(
            item.material_factors || [], 
            snapshot.project_rates.materials
          )
          const laborCost = calculateLaborCost(
            item.labor_factors || [], 
            snapshot.project_rates.labour
          )
          const equipmentCost = calculateEquipmentCost(
            item.equipment_factors || [], 
            snapshot.project_rates.equipment
          )
          
          const unitPrice = materialCost + laborCost + equipmentCost
          const itemTotalCost = unitPrice * totalQuantity
          
          snapshot.item_prices[itemId] = {
            item_code: item.code,
            item_name: item.name,
            unit: item.unit,
            unit_price: Math.round(unitPrice * 100) / 100,
            material_cost: Math.round(materialCost * 100) / 100,
            labor_cost: Math.round(laborCost * 100) / 100,
            equipment_cost: Math.round(equipmentCost * 100) / 100,
            total_quantity: totalQuantity,
            total_cost: Math.round(itemTotalCost * 100) / 100,
            factor_breakdown: {
              materials: (item.material_factors || []).map(f => ({
                code: f.material_catalogues?.code,
                name: f.material_catalogues?.name,
                quantity: f.quantity_per_unit,
                wastage: f.wastage_percentage,
                rate: snapshot.project_rates.materials[f.material_catalogue_id] || f.material_catalogues?.rate || 0
              })),
              labor: (item.labor_factors || []).map(f => ({
                code: f.labor_catalogues?.code,
                name: f.labor_catalogues?.name,
                hours: f.hours_per_unit,
                productivity: f.productivity_factor,
                crew_size: f.crew_size,
                rate: snapshot.project_rates.labour[f.labor_catalogue_id] || f.labor_catalogues?.rate || 0
              })),
              equipment: (item.equipment_factors || []).map(f => ({
                code: f.equipment_catalogues?.code,
                name: f.equipment_catalogues?.name,
                hours: f.hours_per_unit,
                utilization: f.utilization_factor,
                rate: snapshot.project_rates.equipment[f.equipment_catalogue_id] || f.equipment_catalogues?.rate || 0
              }))
            }
          }

          totalValue += itemTotalCost
          processedCount++

        } catch (error) {
          console.error(`Error calculating price for item ${itemId}:`, error)
          // Continue processing other items
        }
      }

      snapshot.metadata.total_value = Math.round(totalValue * 100) / 100

      // Store snapshot
      const { error: snapshotError } = await supabaseClient
        .from('price_snapshots')
        .insert(snapshot)

      if (snapshotError) {
        console.error('Error storing snapshot:', snapshotError)
        throw snapshotError
      }

      // Update job log with success
      if (jobLogId) {
        await supabaseClient
          .from('background_job_logs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              project_id: projectId,
              items_processed: processedCount,
              total_items_found: itemQuantities.size,
              total_snapshot_value: snapshot.metadata.total_value,
              include_all_items: includeAllItems,
              execution_time_ms: Date.now() - new Date(logEntry?.started_at).getTime()
            }
          })
          .eq('id', jobLogId)
      }

      console.log(`Price snapshot completed: ${processedCount} items, $${snapshot.metadata.total_value}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          project_id: projectId,
          items_processed: processedCount,
          total_value: snapshot.metadata.total_value,
          snapshot_date: snapshot.snapshot_date,
          message: `Captured snapshot for ${processedCount} items with total value $${snapshot.metadata.total_value}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } catch (error) {
      console.error('Snapshot execution error:', error)
      
      // Update job log with failure
      if (jobLogId) {
        await supabaseClient
          .from('background_job_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
            metadata: {
              project_id: projectId,
              error_details: error.stack,
              failed_at_step: 'snapshot_creation'
            }
          })
          .eq('id', jobLogId)
      }

      throw error
    }

  } catch (error) {
    console.error('Price snapshot failed:', error)
    
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
 * Calculate material cost from factors and project rates
 */
function calculateMaterialCost(factors: any[], rates: Record<string, number>): number {
  return factors.reduce((total, factor) => {
    const rate = rates[factor.material_catalogue_id] || factor.material_catalogues?.rate || 0
    const wastageMultiplier = 1 + (factor.wastage_percentage || 0) / 100
    const effectiveQuantity = factor.quantity_per_unit * wastageMultiplier
    return total + (effectiveQuantity * rate)
  }, 0)
}

/**
 * Calculate labor cost from factors and project rates
 */
function calculateLaborCost(factors: any[], rates: Record<string, number>): number {
  return factors.reduce((total, factor) => {
    const rate = rates[factor.labor_catalogue_id] || factor.labor_catalogues?.rate || 0
    const productivityAdjusted = factor.hours_per_unit / (factor.productivity_factor || 1)
    const crewHours = productivityAdjusted * (factor.crew_size || 1)
    return total + (crewHours * rate)
  }, 0)
}

/**
 * Calculate equipment cost from factors and project rates
 */
function calculateEquipmentCost(factors: any[], rates: Record<string, number>): number {
  return factors.reduce((total, factor) => {
    const rate = rates[factor.equipment_catalogue_id] || factor.equipment_catalogues?.rate || 0
    const effectiveHours = factor.hours_per_unit * (factor.utilization_factor || 1)
    return total + (effectiveHours * rate)
  }, 0)
}