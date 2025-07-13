import { createClient } from '@/shared/lib/supabase/client'
import { Database } from '@/types/supabase'

// Initialize the client once
const supabase = createClient()

// Define types for new tables
type EstimateStructure = {
  id: string;
  name: string;
  amount: number;
  order_index: number;
  project_id: string;
  created_at: string;
  updated_at: string;
}

type EstimateElement = {
  id: string;
  name: string;
  amount: number;
  order_index: number;
  structure_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

type EstimateDetailItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  order_index: number;
  element_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

// Legacy type - keep for backward compatibility
type EstimateItem = Database['public']['Tables']['estimate_items']['Row']
type Project = Database['public']['Tables']['projects']['Row']

export class EstimateService {
  /**
   * Legacy method - fetch full estimate via the compatibility view
   */
  static async getProjectEstimate(projectId: string): Promise<EstimateItem[]> {
    const { data, error } = await supabase
      .from('estimate_items_view')
      .select('*')
      .eq('project_id', projectId)
      .order('order', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * New method - fetch all structures (Level 0)
   */
  static async getProjectStructures(projectId: string): Promise<EstimateStructure[]> {
    const { data, error } = await supabase
      .from('estimate_structures')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * New method - fetch elements (Level 1) for a structure
   */
  static async getStructureElements(structureId: string): Promise<EstimateElement[]> {
    const { data, error } = await supabase
      .from('estimate_elements')
      .select('*')
      .eq('structure_id', structureId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * New method - fetch all elements (Level 1) for a project
   */
  static async getProjectElements(projectId: string): Promise<EstimateElement[]> {
    const { data, error } = await supabase
      .from('estimate_elements')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * New method - fetch detail items (Level 2) for an element
   */
  static async getElementDetailItems(elementId: string): Promise<EstimateDetailItem[]> {
    const { data, error } = await supabase
      .from('estimate_detail_items')
      .select('*')
      .eq('element_id', elementId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * New method - fetch all detail items (Level 2) for a project
   */
  static async getProjectDetailItems(projectId: string): Promise<EstimateDetailItem[]> {
    const { data, error } = await supabase
      .from('estimate_detail_items')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * New method - create a structure (Level 0)
   */
  static async createStructure(structure: Omit<EstimateStructure, 'id' | 'created_at' | 'updated_at'>): Promise<EstimateStructure> {
    const { data, error } = await supabase
      .from('estimate_structures')
      .insert(structure)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * New method - create an element (Level 1)
   */
  static async createElement(element: Omit<EstimateElement, 'id' | 'created_at' | 'updated_at'>): Promise<EstimateElement> {
    // Ensure we only pass the fields that exist in estimate_elements table
    const cleanElement = {
      name: element.name,
      amount: element.amount,
      order_index: element.order_index,
      structure_id: element.structure_id,
      project_id: element.project_id
    };
    
    console.log('createElement: Inserting clean element:', cleanElement);
    console.log('Data types:', {
      name: typeof element.name,
      amount: typeof element.amount,
      order_index: typeof element.order_index,
      structure_id: typeof element.structure_id,
      project_id: typeof element.project_id
    });
    
    // Try a different approach - build the insert object inline
    const { data, error } = await supabase
      .from('estimate_elements')
      .insert({
        name: cleanElement.name,
        amount: cleanElement.amount,
        order_index: cleanElement.order_index,
        structure_id: cleanElement.structure_id,
        project_id: cleanElement.project_id
      })
      .select()
      .single()

    if (error) {
      console.error('createElement error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    return data
  }

  /**
   * New method - create a detail item (Level 2)
   */
  static async createDetailItem(item: Omit<EstimateDetailItem, 'id' | 'created_at' | 'updated_at' | 'amount'>): Promise<EstimateDetailItem> {
    const { data, error } = await supabase
      .from('estimate_detail_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * New method - update a structure (Level 0)
   */
  static async updateStructure(id: string, updates: Partial<EstimateStructure>): Promise<EstimateStructure> {
    const { data, error } = await supabase
      .from('estimate_structures')
      .update({...updates, updated_at: new Date().toISOString()})
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * New method - update an element (Level 1)
   */
  static async updateElement(id: string, updates: Partial<EstimateElement>): Promise<EstimateElement> {
    const { data, error } = await supabase
      .from('estimate_elements')
      .update({...updates, updated_at: new Date().toISOString()})
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * New method - update a detail item (Level 2)
   */
  static async updateDetailItem(id: string, updates: Partial<Omit<EstimateDetailItem, 'amount'>>): Promise<EstimateDetailItem> {
    const { data, error } = await supabase
      .from('estimate_detail_items')
      .update({...updates, updated_at: new Date().toISOString()})
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * New method - delete a structure (Level 0) and all its children
   */
  static async deleteStructure(id: string): Promise<void> {
    const { error } = await supabase
      .from('estimate_structures')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * New method - delete an element (Level 1) and all its children
   */
  static async deleteElement(id: string): Promise<void> {
    const { error } = await supabase
      .from('estimate_elements')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * New method - delete a detail item (Level 2)
   */
  static async deleteDetailItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('estimate_detail_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // =================================================================
  // PHASE 0: LIBRARY-ONLY JUNCTION TABLE METHODS
  // =================================================================

  /**
   * Add library item to element (Phase 0)
   * Replaces manual detail item creation
   */
  static async addLibraryItemToElement(
    elementId: string, 
    libraryItemId: string, 
    quantity: number,
    rateCalculated?: number
  ): Promise<any> {
    // Get next order index
    const { data: existingItems } = await supabase
      .from('estimate_element_items')
      .select('order_index')
      .eq('element_id', elementId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = (existingItems?.[0]?.order_index || 0) + 1;

    const { data, error } = await supabase
      .from('estimate_element_items')
      .insert({
        element_id: elementId,
        library_item_id: libraryItemId,
        quantity: quantity,
        rate_calculated: rateCalculated,
        order_index: nextOrderIndex
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Remove library item from element (Phase 0)
   */
  static async removeLibraryItemFromElement(elementItemId: string): Promise<void> {
    const { error } = await supabase
      .from('estimate_element_items')
      .delete()
      .eq('id', elementItemId);

    if (error) throw error;
  }

  /**
   * Update element item quantity (Phase 0)
   */
  static async updateElementItemQuantity(elementItemId: string, quantity: number): Promise<void> {
    const { error } = await supabase
      .from('estimate_element_items')
      .update({ quantity })
      .eq('id', elementItemId);

    if (error) throw error;
  }

  /**
   * Update element item rate (Phase 0)
   */
  static async updateElementItemRate(elementItemId: string, rateManual: number): Promise<void> {
    const { error } = await supabase
      .from('estimate_element_items')
      .update({ rate_manual: rateManual })
      .eq('id', elementItemId);

    if (error) throw error;
  }

  /**
   * Get element items using the display view (Phase 0)
   */
  static async getElementItems(elementId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('estimate_items_display')
      .select('*')
      .eq('element_id', elementId)
      .order('order_index');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all items for a project using the display view (Phase 0)
   */
  static async getProjectItems(projectId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('estimate_items_display')
      .select('*')
      .eq('structure_name', projectId) // This might need adjustment based on actual view structure
      .order('order_index');

    if (error) throw error;
    return data || [];
  }

  // Legacy methods for backward compatibility
  
  static async createEstimateItem(item: Database['public']['Tables']['estimate_items']['Insert']): Promise<EstimateItem> {
    try {
      console.log('EstimateService.createEstimateItem called with:', JSON.stringify(item, null, 2));
      
      // Determine which table to insert into based on level
      if (item.level === 0) {
        const structureData = await this.createStructure({
          name: item.name,
          amount: item.amount || 0,
          order_index: item.order,
          project_id: item.project_id
        });
        
        // Convert to legacy format
        return {
          id: structureData.id,
          name: structureData.name,
          description: null,
          quantity: 0,
          unit: '',
          unit_cost: 0,
          amount: structureData.amount,
          is_parent: true,
          level: 0,
          order: structureData.order_index,
          parent_id: null,
          project_id: structureData.project_id,
          created_at: structureData.created_at,
          updated_at: structureData.updated_at
        };
      } 
      else if (item.level === 1 && item.parent_id) {
        console.log('Creating Level 1 element with data:', {
          name: item.name,
          amount: item.amount || 0,
          order_index: item.order,
          structure_id: item.parent_id,
          project_id: item.project_id
        });
        
        const elementData = await this.createElement({
          name: item.name,
          amount: item.amount || 0,
          order_index: item.order,
          structure_id: item.parent_id,
          project_id: item.project_id
        });
        
        // Convert to legacy format
        return {
          id: elementData.id,
          name: elementData.name,
          description: null,
          quantity: 0,
          unit: '',
          unit_cost: 0,
          amount: elementData.amount,
          is_parent: true,
          level: 1,
          order: elementData.order_index,
          parent_id: elementData.structure_id,
          project_id: elementData.project_id,
          created_at: elementData.created_at,
          updated_at: elementData.updated_at
        };
      }
      else if (item.level === 2 && item.parent_id) {
        const detailData = await this.createDetailItem({
          name: item.name,
          quantity: item.quantity || 0,
          unit: item.unit || '',
          rate: item.unit_cost || 0,
          order_index: item.order,
          element_id: item.parent_id,
          project_id: item.project_id
        });
        
        // Convert to legacy format
        return {
          id: detailData.id,
          name: detailData.name,
          description: null,
          quantity: detailData.quantity,
          unit: detailData.unit,
          unit_cost: detailData.rate,
          amount: detailData.amount,
          is_parent: false,
          level: 2,
          order: detailData.order_index,
          parent_id: detailData.element_id,
          project_id: detailData.project_id,
          created_at: detailData.created_at,
          updated_at: detailData.updated_at
        };
      }
      else {
        throw new Error('Invalid item level or missing parent_id');
      }
    } catch (error) {
      console.error('Error in createEstimateItem:', error);
      throw error;
    }
  }

  static async updateEstimateItem(id: string, updates: Database['public']['Tables']['estimate_items']['Update']): Promise<EstimateItem> {
    try {
      // First determine what level the item is
      const { data, error } = await supabase
        .from('estimate_items_view')
        .select('level')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (!data) throw new Error('Item not found');
      
      // Based on level, update the appropriate table
      if (data.level === 0) {
        const structureData = await this.updateStructure(id, {
          name: updates.name,
          order_index: updates.order
        });
        
        // Convert to legacy format
        return {
          id: structureData.id,
          name: structureData.name,
          description: null,
          quantity: 0,
          unit: '',
          unit_cost: 0,
          amount: structureData.amount,
          is_parent: true,
          level: 0,
          order: structureData.order_index,
          parent_id: null,
          project_id: structureData.project_id,
          created_at: structureData.created_at,
          updated_at: structureData.updated_at
        };
      }
      else if (data.level === 1) {
        const elementData = await this.updateElement(id, {
          name: updates.name,
          order_index: updates.order
        });
        
        // Convert to legacy format
        return {
          id: elementData.id,
          name: elementData.name,
          description: null,
          quantity: 0,
          unit: '',
          unit_cost: 0,
          amount: elementData.amount,
          is_parent: true,
          level: 1,
          order: elementData.order_index,
          parent_id: elementData.structure_id,
          project_id: elementData.project_id,
          created_at: elementData.created_at,
          updated_at: elementData.updated_at
        };
      }
      else if (data.level === 2) {
        const detailData = await this.updateDetailItem(id, {
          name: updates.name,
          quantity: updates.quantity,
          unit: updates.unit,
          rate: updates.unit_cost,
          order_index: updates.order
        });
        
        // Convert to legacy format
        return {
          id: detailData.id,
          name: detailData.name,
          description: null,
          quantity: detailData.quantity,
          unit: detailData.unit,
          unit_cost: detailData.rate,
          amount: detailData.amount,
          is_parent: false,
          level: 2,
          order: detailData.order_index,
          parent_id: detailData.element_id,
          project_id: detailData.project_id,
          created_at: detailData.created_at,
          updated_at: detailData.updated_at
        };
      }
      else {
        throw new Error('Invalid item level');
      }
    } catch (error) {
      console.error('Error in updateEstimateItem:', error);
      throw error;
    }
  }

  static async deleteEstimateItem(id: string): Promise<void> {
    try {
      // Call the secure RPC function that respects row level security
      const { data, error } = await supabase.rpc('safe_delete_estimate_item', { item_id: id });
      
      if (error) {
        console.error('Error in deleteEstimateItem RPC call:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Failed to delete item or user does not have permission');
      }
    } catch (error) {
      console.error('Error in deleteEstimateItem:', error);
      throw error;
    }
  }

  static async reorderEstimateItems(items: { id: string; order: number }[]): Promise<void> {
    try {
      for (const item of items) {
        // First determine what level the item is
        const { data, error } = await supabase
          .from('estimate_items_view')
          .select('level')
          .eq('id', item.id)
          .single();
          
        if (error) throw error;
        
        if (!data) throw new Error('Item not found');
        
        // Based on level, update the appropriate table
        if (data.level === 0) {
          await this.updateStructure(item.id, { order_index: item.order });
        }
        else if (data.level === 1) {
          await this.updateElement(item.id, { order_index: item.order });
        }
        else if (data.level === 2) {
          await this.updateDetailItem(item.id, { order_index: item.order });
        }
      }
    } catch (error) {
      console.error('Error in reorderEstimateItems:', error);
      throw error;
    }
  }

  static async calculateTotals(projectId: string) {
    try {
      // Phase 0: Use the new junction table approach via display view
      // First get element IDs for this project
      const { data: elements, error: elementsError } = await supabase
        .from('estimate_elements')
        .select('id')
        .eq('project_id', projectId);

      if (elementsError) throw elementsError;
      
      const elementIds = elements?.map(el => el.id) || [];
      
      if (elementIds.length === 0) {
        return {
          projectTotal: 0,
          totalOverheads: 0,
          totalProfit: 0,
          totalVAT: 0,
          materialTotal: 0,
          labourTotal: 0,
          equipmentTotal: 0,
        };
      }

      // Now get items for these elements
      const { data: items, error } = await supabase
        .from('estimate_items_display')
        .select('amount_effective')
        .in('element_id', elementIds);

      if (error) throw error;

      const totalAmount = (items || []).reduce((sum, item) => sum + (item.amount_effective || 0), 0);
      
      return {
        projectTotal: totalAmount,
        totalOverheads: totalAmount * 0.1,
        totalProfit: totalAmount * 0.05,
        totalVAT: totalAmount * 0.16,
        materialTotal: totalAmount * 0.4,
        labourTotal: totalAmount * 0.3,
        equipmentTotal: totalAmount * 0.15,
      };
    } catch (error) {
      console.error('Error in calculateTotals:', error);
      
      // Fallback to legacy calculation if Phase 0 fails
      const detailItems = await this.getProjectDetailItems(projectId);
      
      return detailItems.reduce((acc, item) => {
        return {
          projectTotal: acc.projectTotal + (item.amount || 0),
          totalOverheads: acc.totalOverheads + (item.amount || 0) * 0.1,
          totalProfit: acc.totalProfit + (item.amount || 0) * 0.05,
          totalVAT: acc.totalVAT + (item.amount || 0) * 0.16,
          materialTotal: acc.materialTotal + (item.amount || 0) * 0.4,
          labourTotal: acc.labourTotal + (item.amount || 0) * 0.3,
          equipmentTotal: acc.equipmentTotal + (item.amount || 0) * 0.15,
        }
      }, {
        projectTotal: 0,
        totalOverheads: 0,
        totalProfit: 0,
        totalVAT: 0,
        materialTotal: 0,
        labourTotal: 0,
        equipmentTotal: 0,
      });
    }
  }
} 