import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalculationOptions {
  includeIndirectCosts?: boolean;
  includeOverheads?: boolean;
  includeContingency?: boolean;
  indirectCostPercentage?: number;
  overheadPercentage?: number;
  contingencyPercentage?: number;
  bulkDiscountPercentage?: number;
  locationAdjustmentFactor?: number;
  seasonalAdjustmentFactor?: number;
}

interface DetailedCosts {
  material: number;
  labor: number;
  equipment: number;
  direct_total: number;
  indirect: number;
  overhead: number;
  contingency: number;
  bulk_discount: number;
  location_adjustment: number;
  seasonal_adjustment: number;
  total: number;
}

interface FactorDetail {
  code?: string;
  name?: string;
  quantity?: number;
  hours?: number;
  rate: number;
  cost: number;
  wastage?: number;
  productivity?: number;
  crew_size?: number;
  utilization?: number;
  effective_quantity?: number;
  effective_hours?: number;
}

interface CalculationResult {
  library_item_id: string;
  code: string;
  name: string;
  unit: string;
  costs: DetailedCosts;
  details: {
    materials: FactorDetail[];
    labor: FactorDetail[];
    equipment: FactorDetail[];
  };
  rates_used: {
    materials: Record<string, number>;
    labour: Record<string, number>;
    equipment: Record<string, number>;
  };
  adjustments_applied: {
    bulk_discount: boolean;
    location_adjustment: boolean;
    seasonal_adjustment: boolean;
  };
  calculation_date: string;
  error?: string;
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

    if (!libraryItemIds || !Array.isArray(libraryItemIds) || libraryItemIds.length === 0) {
      throw new Error('libraryItemIds array is required')
    }

    if (!projectId) {
      throw new Error('projectId is required')
    }

    const {
      includeIndirectCosts = false,
      includeOverheads = false,
      includeContingency = false,
      indirectCostPercentage = 15,
      overheadPercentage = 10,
      contingencyPercentage = 5,
      bulkDiscountPercentage = 0,
      locationAdjustmentFactor = 1.0,
      seasonalAdjustmentFactor = 1.0
    } = options

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Starting complex calculations for ${libraryItemIds.length} items in project ${projectId}`)

    // Log start of job
    const { data: logEntry } = await supabaseClient
      .from('background_job_logs')
      .insert({
        job_name: 'calculate-complex-factors',
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { 
          project_id: projectId, 
          item_count: libraryItemIds.length,
          options
        }
      })
      .select()
      .single()

    const jobLogId = logEntry?.id

    try {
      // Get project rates
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

      const rates = {
        materials: projectRates?.materials || {},
        labour: projectRates?.labour || {},
        equipment: projectRates?.equipment || {}
      }

      console.log('Project rates loaded:', projectRates ? 'Custom rates found' : 'Using default catalog rates')

      const results: CalculationResult[] = []
      const batchSize = 50 // Process in batches to avoid memory issues

      // Process items in batches
      for (let i = 0; i < libraryItemIds.length; i += batchSize) {
        const batch = libraryItemIds.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(libraryItemIds.length / batchSize)}`)

        // Get items with all factors
        const { data: items, error: itemsError } = await supabaseClient
          .from('library_items')
          .select(`
            id,
            code,
            name,
            unit,
            status,
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
          .in('id', batch)

        if (itemsError) {
          console.error('Error fetching items:', itemsError)
          throw itemsError
        }

        // Process each item in the batch
        for (const item of items || []) {
          try {
            const result = await calculateItemCosts(item, rates, options)
            results.push(result)
          } catch (error) {
            console.error(`Error calculating costs for item ${item.id}:`, error)
            results.push({
              library_item_id: item.id,
              code: item.code || 'UNKNOWN',
              name: item.name || 'Unknown Item',
              unit: item.unit || 'EA',
              costs: createEmptyCosts(),
              details: { materials: [], labor: [], equipment: [] },
              rates_used: rates,
              adjustments_applied: { bulk_discount: false, location_adjustment: false, seasonal_adjustment: false },
              calculation_date: new Date().toISOString(),
              error: error.message
            })
          }
        }
      }

      // Calculate summary statistics
      const totalCost = results.reduce((sum, item) => sum + (item.costs?.total || 0), 0)
      const successfulCalculations = results.filter(r => !r.error).length
      const failedCalculations = results.filter(r => r.error).length

      // Update job log with success
      if (jobLogId) {
        await supabaseClient
          .from('background_job_logs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              project_id: projectId,
              items_requested: libraryItemIds.length,
              items_processed: successfulCalculations,
              items_failed: failedCalculations,
              total_calculated_cost: Math.round(totalCost * 100) / 100,
              options_used: options,
              execution_time_ms: Date.now() - new Date(logEntry?.started_at).getTime()
            }
          })
          .eq('id', jobLogId)
      }

      console.log(`Complex calculations completed: ${successfulCalculations} successful, ${failedCalculations} failed`)

      return new Response(
        JSON.stringify({ 
          success: true,
          results,
          summary: {
            items_requested: libraryItemIds.length,
            items_calculated: successfulCalculations,
            items_failed: failedCalculations,
            total_cost: Math.round(totalCost * 100) / 100,
            average_cost_per_item: successfulCalculations > 0 ? Math.round((totalCost / successfulCalculations) * 100) / 100 : 0
          },
          options_applied: options,
          calculation_timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } catch (error) {
      console.error('Calculation execution error:', error)
      
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
              items_requested: libraryItemIds.length,
              error_details: error.stack,
              failed_at_step: 'calculation_processing'
            }
          })
          .eq('id', jobLogId)
      }

      throw error
    }

  } catch (error) {
    console.error('Complex factor calculation failed:', error)
    
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
 * Calculate comprehensive costs for a single library item
 */
async function calculateItemCosts(
  item: any, 
  rates: { materials: Record<string, number>, labour: Record<string, number>, equipment: Record<string, number> },
  options: CalculationOptions
): Promise<CalculationResult> {
  const {
    includeIndirectCosts = false,
    includeOverheads = false,
    includeContingency = false,
    indirectCostPercentage = 15,
    overheadPercentage = 10,
    contingencyPercentage = 5,
    bulkDiscountPercentage = 0,
    locationAdjustmentFactor = 1.0,
    seasonalAdjustmentFactor = 1.0
  } = options

  // Calculate base costs
  let materialCost = 0
  let laborCost = 0
  let equipmentCost = 0

  // Material calculations with detailed breakdown
  const materialDetails: FactorDetail[] = (item.material_factors || []).map((factor: any) => {
    const catalogRate = factor.material_catalogues?.rate || 0
    const projectRate = rates.materials[factor.material_catalogue_id]
    const rate = projectRate !== undefined ? projectRate : catalogRate
    
    const wastageMultiplier = 1 + (factor.wastage_percentage || 0) / 100
    const effectiveQuantity = factor.quantity_per_unit * wastageMultiplier
    const cost = effectiveQuantity * rate

    materialCost += cost

    return {
      code: factor.material_catalogues?.code,
      name: factor.material_catalogues?.name,
      quantity: factor.quantity_per_unit,
      wastage: factor.wastage_percentage,
      effective_quantity: effectiveQuantity,
      rate,
      cost: Math.round(cost * 100) / 100
    }
  })

  // Labor calculations with detailed breakdown
  const laborDetails: FactorDetail[] = (item.labor_factors || []).map((factor: any) => {
    const catalogRate = factor.labor_catalogues?.rate || 0
    const projectRate = rates.labour[factor.labor_catalogue_id]
    const rate = projectRate !== undefined ? projectRate : catalogRate
    
    const productivityAdjusted = factor.hours_per_unit / (factor.productivity_factor || 1)
    const crewHours = productivityAdjusted * (factor.crew_size || 1)
    const cost = crewHours * rate

    laborCost += cost

    return {
      code: factor.labor_catalogues?.code,
      name: factor.labor_catalogues?.name,
      hours: factor.hours_per_unit,
      productivity: factor.productivity_factor,
      crew_size: factor.crew_size,
      effective_hours: crewHours,
      rate,
      cost: Math.round(cost * 100) / 100
    }
  })

  // Equipment calculations with detailed breakdown
  const equipmentDetails: FactorDetail[] = (item.equipment_factors || []).map((factor: any) => {
    const catalogRate = factor.equipment_catalogues?.rate || 0
    const projectRate = rates.equipment[factor.equipment_catalogue_id]
    const rate = projectRate !== undefined ? projectRate : catalogRate
    
    const effectiveHours = factor.hours_per_unit * (factor.utilization_factor || 1)
    const cost = effectiveHours * rate

    equipmentCost += cost

    return {
      code: factor.equipment_catalogues?.code,
      name: factor.equipment_catalogues?.name,
      hours: factor.hours_per_unit,
      utilization: factor.utilization_factor,
      effective_hours: effectiveHours,
      rate,
      cost: Math.round(cost * 100) / 100
    }
  })

  // Calculate additional costs and adjustments
  const directCost = materialCost + laborCost + equipmentCost
  
  let indirectCost = 0
  let overhead = 0
  let contingency = 0
  let bulkDiscount = 0
  let locationAdjustment = 0
  let seasonalAdjustment = 0

  if (includeIndirectCosts) {
    indirectCost = directCost * (indirectCostPercentage / 100)
  }

  if (includeOverheads) {
    overhead = (directCost + indirectCost) * (overheadPercentage / 100)
  }

  if (includeContingency) {
    contingency = (directCost + indirectCost + overhead) * (contingencyPercentage / 100)
  }

  // Apply bulk discount (negative cost)
  if (bulkDiscountPercentage > 0) {
    bulkDiscount = -(directCost + indirectCost + overhead + contingency) * (bulkDiscountPercentage / 100)
  }

  // Apply location adjustment
  if (locationAdjustmentFactor !== 1.0) {
    const baseCost = directCost + indirectCost + overhead + contingency + bulkDiscount
    locationAdjustment = baseCost * (locationAdjustmentFactor - 1.0)
  }

  // Apply seasonal adjustment
  if (seasonalAdjustmentFactor !== 1.0) {
    const baseCost = directCost + indirectCost + overhead + contingency + bulkDiscount + locationAdjustment
    seasonalAdjustment = baseCost * (seasonalAdjustmentFactor - 1.0)
  }

  const totalCost = directCost + indirectCost + overhead + contingency + bulkDiscount + locationAdjustment + seasonalAdjustment

  const costs: DetailedCosts = {
    material: Math.round(materialCost * 100) / 100,
    labor: Math.round(laborCost * 100) / 100,
    equipment: Math.round(equipmentCost * 100) / 100,
    direct_total: Math.round(directCost * 100) / 100,
    indirect: Math.round(indirectCost * 100) / 100,
    overhead: Math.round(overhead * 100) / 100,
    contingency: Math.round(contingency * 100) / 100,
    bulk_discount: Math.round(bulkDiscount * 100) / 100,
    location_adjustment: Math.round(locationAdjustment * 100) / 100,
    seasonal_adjustment: Math.round(seasonalAdjustment * 100) / 100,
    total: Math.round(totalCost * 100) / 100
  }

  return {
    library_item_id: item.id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    costs,
    details: {
      materials: materialDetails,
      labor: laborDetails,
      equipment: equipmentDetails
    },
    rates_used: rates,
    adjustments_applied: {
      bulk_discount: bulkDiscountPercentage > 0,
      location_adjustment: locationAdjustmentFactor !== 1.0,
      seasonal_adjustment: seasonalAdjustmentFactor !== 1.0
    },
    calculation_date: new Date().toISOString()
  }
}

/**
 * Create empty costs structure for error cases
 */
function createEmptyCosts(): DetailedCosts {
  return {
    material: 0,
    labor: 0,
    equipment: 0,
    direct_total: 0,
    indirect: 0,
    overhead: 0,
    contingency: 0,
    bulk_discount: 0,
    location_adjustment: 0,
    seasonal_adjustment: 0,
    total: 0
  }
}