import { createClient } from '@/shared/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { CostControlItem } from '@/types/supabase';

interface EstimateItem {
  id: string;
  name: string;          // This is the name field from estimate_items
  amount: number;        // This is the amount field from estimate_items
  level: number;
  parent_id?: string;
  project_id: string;
  quantity?: number;
  rate?: number;
  order: number;        // Order index field from estimate_items_view
}

/**
 * Fetches estimate data from the database for a specific project
 */
export async function fetchEstimateData(projectId: string): Promise<{ data: EstimateItem[], error: any }> {
  const supabase = createClient();
  
  console.log('Fetching estimate data for project:', projectId);
  
  // Fetch specific fields to match our EstimateItem interface
  const { data, error } = await supabase
    .from('estimate_items_view')
    .select('id, name, amount, level, parent_id, project_id, quantity, rate, order')
    .eq('project_id', projectId)
    .order('level', { ascending: true });
    // Now fetching all levels (0, 1, 2) to verify calculations
    
  if (error) {
    console.error('Error fetching estimate data:', error);
  } else {
    console.log(`Fetched ${data?.length || 0} estimate items`);
    
    // Count items by level
    const level0Count = data?.filter(item => item.level === 0).length || 0;
    const level1Count = data?.filter(item => item.level === 1).length || 0;
    const level2Count = data?.filter(item => item.level === 2).length || 0;
    console.log(`Items by level: Level 0: ${level0Count}, Level 1: ${level1Count}, Level 2: ${level2Count}`);
    
    // Log the first few items to verify the data structure
    if (data && data.length > 0) {
      console.log('Sample data (first 3 items):');
      data.slice(0, 3).forEach(item => {
        console.log(`ID: ${item.id}, Name: ${item.name}, Level: ${item.level}, Amount: ${item.amount}, Order: ${item.order}`);
        if (item.level === 2) {
          console.log(`  Quantity: ${item.quantity}, Rate: ${item.rate}`);
        }
      });
    }
  }
  
  return { data: data || [], error };
}

/**
 * Imports estimate data to cost control for a project
 * @param projectId The project ID to import data for
 * @param recalculateParents Whether to recalculate parent bo_amount based on children sum (default: false)
 */
export async function importEstimateDataToCostControl(
  projectId: string, 
  recalculateParents: boolean = false
): Promise<{ success: boolean, error?: any, warning?: string }> {
  try {
    console.log('Import function called, but auto-sync triggers handle this now');
    console.log('Project:', projectId, 'RecalculateParents:', recalculateParents);
    
    // Since we now have auto-sync triggers, this function is redundant
    // Just return success to maintain compatibility with existing UI
    return { 
      success: true, 
      warning: 'Cost control is now automatically synchronized with estimates via database triggers. Manual import is no longer needed.' 
    };
  } catch (error) {
    console.error('Unexpected error during import:', error);
    return { success: false, error: { message: 'Unexpected error during import', details: error } };
  }
}

export async function getProjectIdByName(projectName: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('name', projectName)
      .single()
    
    if (error) {
      console.error('Error finding project by name:', error)
      return null
    }
    
    return data?.id || null
  } catch (error) {
    console.error('Unexpected error getting project ID:', error)
    return null
  }
}

export async function importFromExcel(file: File, projectId: string): Promise<{ success: boolean, error?: string }> {
  try {
    const supabase = createClient()
    
    // This function is deprecated in favor of auto-sync triggers
    return { 
      success: true,
      error: 'Excel import is deprecated. Cost control items are now automatically created when estimate items are added.'
    }
  } catch (error) {
    console.error('Error importing from Excel:', error)
    return { success: false, error: 'Failed to import from Excel' }
  }
}