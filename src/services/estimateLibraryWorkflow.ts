/**
 * EstimateLibraryWorkflow Service
 * Implements Phase 0 Library-Only Items Architecture
 * 
 * This service provides seamless workflows for adding library items to estimates,
 * following the Phase 0 specification where ALL estimate items come from the library.
 */

import { supabase } from '@/utils/supabase/client';

// Types
export interface LibraryItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  status: string;
  assembly_id: string;
}

export interface ElementItem {
  id: string;
  element_id: string;
  library_item_id: string;
  quantity: number;
  rate_manual?: number;
  rate_calculated?: number;
  rate_override?: number;
  order_index: number;
}

export interface SearchResult {
  found: boolean;
  items?: LibraryItem[];
  action: 'SHOW_SELECTION' | 'SHOW_QUICK_ADD';
  prefillData?: {
    name: string;
  };
}

export interface RateCalculation {
  material_total: number;
  labor_total: number;
  equipment_total: number;
  total: number;
  breakdown: {
    materials: Array<{ name: string; quantity: number; rate: number; amount: number }>;
    labor: Array<{ name: string; hours: number; rate: number; amount: number }>;
    equipment: Array<{ name: string; hours: number; rate: number; amount: number }>;
  };
}

/**
 * EstimateLibraryWorkflow Class
 * Handles the seamless addition of library items to estimate elements
 */
export class EstimateLibraryWorkflow {
  
  /**
   * Search library and determine next action
   * As per Phase 0: Search library first, guide to quick-add if not found
   */
  async addItemToElement(elementId: string, searchTerm: string): Promise<SearchResult> {
    try {
      // Search library first
      const items = await this.searchLibrary(searchTerm);
      
      if (items.length === 0) {
        // Not found - guide to quick add
        return { 
          found: false, 
          action: 'SHOW_QUICK_ADD',
          prefillData: { name: searchTerm }
        };
      }
      
      // Found - let user select
      return { 
        found: true, 
        items,
        action: 'SHOW_SELECTION' 
      };
    } catch (error) {
      console.error('Error in addItemToElement:', error);
      throw error;
    }
  }

  /**
   * Search library items with fuzzy matching
   */
  async searchLibrary(searchTerm: string): Promise<LibraryItem[]> {
    try {
      const { data, error } = await supabase
        .from('library_items')
        .select('id, code, name, unit, status, assembly_id')
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .eq('status', 'confirmed')
        .order('name')
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching library:', error);
      throw error;
    }
  }

  /**
   * Calculate rates from library item factors and project settings
   * As per Phase 0: Calculate rate from factors + project rates + adjustments
   */
  async calculateItemRate(libraryItemId: string, projectId: string): Promise<RateCalculation> {
    try {
      // Get library item with all factors
      const { data: libraryItem, error: itemError } = await supabase
        .from('library_items')
        .select(`
          id, name, unit,
          material_factors!inner(*),
          labor_factors!inner(*),
          equipment_factors!inner(*)
        `)
        .eq('id', libraryItemId)
        .single();

      if (itemError) throw itemError;

      // Get project rates for calculations
      const { data: projectRates, error: ratesError } = await supabase
        .from('project_rates')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (ratesError) throw ratesError;

      // Calculate material costs
      const materialCosts = await this.calculateMaterialCosts(libraryItem.material_factors);
      
      // Calculate labor costs
      const laborCosts = await this.calculateLaborCosts(libraryItem.labor_factors, projectRates);
      
      // Calculate equipment costs
      const equipmentCosts = await this.calculateEquipmentCosts(libraryItem.equipment_factors, projectRates);

      const total = materialCosts.total + laborCosts.total + equipmentCosts.total;

      return {
        material_total: materialCosts.total,
        labor_total: laborCosts.total,
        equipment_total: equipmentCosts.total,
        total,
        breakdown: {
          materials: materialCosts.breakdown,
          labor: laborCosts.breakdown,
          equipment: equipmentCosts.breakdown
        }
      };
    } catch (error) {
      console.error('Error calculating item rate:', error);
      throw error;
    }
  }

  /**
   * Add library item to element with calculated rates
   * Core Phase 0 functionality: Create element item with calculated rate
   */
  async calculateAndAddItem(
    elementId: string, 
    libraryItemId: string, 
    quantity: number,
    projectId: string
  ): Promise<ElementItem> {
    try {
      // Calculate rate from factors
      const calculated = await this.calculateItemRate(libraryItemId, projectId);
      
      // Get next order index
      const { data: existingItems } = await supabase
        .from('estimate_element_items')
        .select('order_index')
        .eq('element_id', elementId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = (existingItems?.[0]?.order_index || 0) + 1;

      // Create element item with calculated rate
      const { data, error } = await supabase
        .from('estimate_element_items')
        .insert({
          element_id: elementId,
          library_item_id: libraryItemId,
          quantity: quantity,
          rate_manual: null,        // User can override later
          rate_calculated: calculated.total,  // M + L + E + adjustments
          rate_override: null,      // No project override initially
          order_index: nextOrderIndex
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding item to element:', error);
      throw error;
    }
  }

  /**
   * Update manual rate override
   * As per Phase 0: User's manual override takes precedence
   */
  async updateManualRate(elementItemId: string, manualRate: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('estimate_element_items')
        .update({
          rate_manual: manualRate   // User's manual override
        })
        .eq('id', elementItemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating manual rate:', error);
      throw error;
    }
  }

  /**
   * Remove library item from element
   */
  async removeLibraryItemFromElement(elementItemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('estimate_element_items')
        .delete()
        .eq('id', elementItemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing item from element:', error);
      throw error;
    }
  }

  /**
   * Update quantity for element item
   */
  async updateElementItemQuantity(elementItemId: string, quantity: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('estimate_element_items')
        .update({ quantity })
        .eq('id', elementItemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item quantity:', error);
      throw error;
    }
  }

  /**
   * Quick add new item to library (draft status)
   * As per Phase 0: Fast draft item creation when not found in library
   */
  async quickAddToLibrary(itemData: {
    name: string;
    unit: string;
    assembly_id: string;
    description?: string;
  }): Promise<LibraryItem> {
    try {
      // Generate code based on assembly
      const { data: assembly } = await supabase
        .from('assemblies')
        .select('code, section_id')
        .eq('id', itemData.assembly_id)
        .single();

      const { data: section } = await supabase
        .from('sections')
        .select('code, division_id')
        .eq('id', assembly?.section_id)
        .single();

      const { data: division } = await supabase
        .from('divisions')
        .select('code')
        .eq('id', section?.division_id)
        .single();

      // Auto-generate code (will be refined by system later)
      const baseCode = `${division?.code}.${section?.code}.${assembly?.code}`;
      
      // Get next item number
      const { data: existingItems } = await supabase
        .from('library_items')
        .select('code')
        .like('code', `${baseCode}%`)
        .order('code', { ascending: false })
        .limit(1);

      let nextNumber = '01';
      if (existingItems?.[0]?.code) {
        const lastCode = existingItems[0].code;
        const lastNumber = parseInt(lastCode.split('.').pop() || '00');
        nextNumber = (lastNumber + 1).toString().padStart(2, '0');
      }

      const generatedCode = `${baseCode}.${nextNumber}`;

      // Create draft library item
      const { data, error } = await supabase
        .from('library_items')
        .insert({
          name: itemData.name,
          unit: itemData.unit,
          assembly_id: itemData.assembly_id,
          description: itemData.description || '',
          code: generatedCode,
          status: 'draft',
          has_materials: false,
          has_labor: false,
          has_equipment: false,
          is_complete: false,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating quick library item:', error);
      throw error;
    }
  }

  /**
   * Get element items for display (using the view)
   */
  async getElementItems(elementId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('estimate_items_display')
        .select('*')
        .eq('element_id', elementId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting element items:', error);
      throw error;
    }
  }

  // Private helper methods for rate calculations

  private async calculateMaterialCosts(materialFactors: any[]) {
    const breakdown: Array<{ name: string; quantity: number; rate: number; amount: number }> = [];
    let total = 0;

    for (const factor of materialFactors || []) {
      const { data: material } = await supabase
        .from('material_catalogue')
        .select('name, base_rate')
        .eq('id', factor.material_id)
        .single();

      if (material) {
        const amount = factor.quantity * material.base_rate;
        breakdown.push({
          name: material.name,
          quantity: factor.quantity,
          rate: material.base_rate,
          amount
        });
        total += amount;
      }
    }

    return { total, breakdown };
  }

  private async calculateLaborCosts(laborFactors: any[], projectRates: any) {
    const breakdown: Array<{ name: string; hours: number; rate: number; amount: number }> = [];
    let total = 0;

    for (const factor of laborFactors || []) {
      const { data: labor } = await supabase
        .from('labor_catalogue')
        .select('name, base_rate')
        .eq('id', factor.labor_id)
        .single();

      if (labor) {
        // Use project rate if available, otherwise base rate
        const rate = projectRates?.labor_rate_multiplier 
          ? labor.base_rate * projectRates.labor_rate_multiplier 
          : labor.base_rate;
        
        const amount = factor.hours * rate;
        breakdown.push({
          name: labor.name,
          hours: factor.hours,
          rate,
          amount
        });
        total += amount;
      }
    }

    return { total, breakdown };
  }

  private async calculateEquipmentCosts(equipmentFactors: any[], projectRates: any) {
    const breakdown: Array<{ name: string; hours: number; rate: number; amount: number }> = [];
    let total = 0;

    for (const factor of equipmentFactors || []) {
      const { data: equipment } = await supabase
        .from('equipment_catalogue')
        .select('name, base_rate')
        .eq('id', factor.equipment_id)
        .single();

      if (equipment) {
        // Use project rate if available, otherwise base rate
        const rate = projectRates?.equipment_rate_multiplier 
          ? equipment.base_rate * projectRates.equipment_rate_multiplier 
          : equipment.base_rate;
        
        const amount = factor.hours * rate;
        breakdown.push({
          name: equipment.name,
          hours: factor.hours,
          rate,
          amount
        });
        total += amount;
      }
    }

    return { total, breakdown };
  }
}

// Export singleton instance
export const estimateLibraryWorkflow = new EstimateLibraryWorkflow();