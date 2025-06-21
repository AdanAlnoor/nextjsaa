import { toast } from 'react-hot-toast';

// Add TypeScript declaration for MCP functions
declare global {
  interface Window {
    mcp_supabase_execute_sql: (params: {
      project_id: string;
      query: string;
    }) => Promise<any>;
  }
}

interface DeduplicationResult {
  success: boolean;
  message: string;
  affectedCount?: number;
}

/**
 * Deduplicates structures with the same name within a project
 */
export async function mcpDeduplicateStructures(projectId: string): Promise<DeduplicationResult> {
  try {
    // Find duplicate structures based on name
    const findDuplicatesResult = await window.mcp_supabase_execute_sql({
      project_id: 'jrsubdglzxjoqpgbbxbq',
      query: `
        SELECT 
          name,
          array_agg(id) AS duplicate_ids,
          array_agg(created_at) AS created_dates
        FROM 
          public.estimate_structures
        WHERE 
          project_id = '${projectId}'
        GROUP BY 
          name, project_id
        HAVING 
          COUNT(*) > 1;
      `
    });

    if (!findDuplicatesResult || findDuplicatesResult.length === 0) {
      return { success: true, message: 'No duplicate structures found', affectedCount: 0 };
    }

    let totalDeduped = 0;

    // Process each set of duplicates
    for (const duplicateSet of findDuplicatesResult) {
      const { name, duplicate_ids, created_dates } = duplicateSet;
      
      // Find the oldest structure to keep (assuming we want to keep the oldest one)
      let oldestIndex = 0;
      for (let i = 1; i < created_dates.length; i++) {
        if (new Date(created_dates[i]) < new Date(created_dates[oldestIndex])) {
          oldestIndex = i;
        }
      }
      
      const keepId = duplicate_ids[oldestIndex];
      const deleteIds = duplicate_ids.filter((id: string) => id !== keepId);
      
      // Reassign elements from duplicates to the structure we're keeping
      for (const deleteId of deleteIds) {
        await window.mcp_supabase_execute_sql({
          project_id: 'jrsubdglzxjoqpgbbxbq',
          query: `
            UPDATE public.estimate_elements
            SET structure_id = '${keepId}'
            WHERE structure_id = '${deleteId}';
          `
        });
        
        // Delete the duplicate structure
        await window.mcp_supabase_execute_sql({
          project_id: 'jrsubdglzxjoqpgbbxbq',
          query: `
            DELETE FROM public.estimate_structures
            WHERE id = '${deleteId}';
          `
        });
        
        totalDeduped++;
      }
    }

    return { 
      success: true, 
      message: `Successfully deduplicated ${totalDeduped} structure(s)`, 
      affectedCount: totalDeduped 
    };
  } catch (error) {
    console.error('Error deduplicating structures:', error);
    return { 
      success: false, 
      message: `Error deduplicating structures: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Deduplicates elements with the same name within a structure
 */
export async function mcpDeduplicateElements(projectId: string): Promise<DeduplicationResult> {
  try {
    // Find duplicate elements based on name and structure_id
    const findDuplicatesResult = await window.mcp_supabase_execute_sql({
      project_id: 'jrsubdglzxjoqpgbbxbq',
      query: `
        SELECT 
          name,
          structure_id,
          array_agg(id) AS duplicate_ids,
          array_agg(created_at) AS created_dates
        FROM 
          public.estimate_elements
        WHERE 
          structure_id IN (
            SELECT id FROM public.estimate_structures 
            WHERE project_id = '${projectId}'
          )
        GROUP BY 
          name, structure_id
        HAVING 
          COUNT(*) > 1;
      `
    });

    if (!findDuplicatesResult || findDuplicatesResult.length === 0) {
      return { success: true, message: 'No duplicate elements found', affectedCount: 0 };
    }

    let totalDeduped = 0;

    // Process each set of duplicates
    for (const duplicateSet of findDuplicatesResult) {
      const { name, structure_id, duplicate_ids, created_dates } = duplicateSet;
      
      // Find the oldest element to keep
      let oldestIndex = 0;
      for (let i = 1; i < created_dates.length; i++) {
        if (new Date(created_dates[i]) < new Date(created_dates[oldestIndex])) {
          oldestIndex = i;
        }
      }
      
      const keepId = duplicate_ids[oldestIndex];
      const deleteIds = duplicate_ids.filter((id: string) => id !== keepId);
      
      // Delete the duplicate elements (no need to reassign anything here)
      for (const deleteId of deleteIds) {
        await window.mcp_supabase_execute_sql({
          project_id: 'jrsubdglzxjoqpgbbxbq',
          query: `
            DELETE FROM public.estimate_elements
            WHERE id = '${deleteId}';
          `
        });
        
        totalDeduped++;
      }
    }

    return { 
      success: true, 
      message: `Successfully deduplicated ${totalDeduped} element(s)`, 
      affectedCount: totalDeduped 
    };
  } catch (error) {
    console.error('Error deduplicating elements:', error);
    return { 
      success: false, 
      message: `Error deduplicating elements: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Deduplicates both structures and elements
 */
export async function mcpDeduplicateAll(projectId: string): Promise<DeduplicationResult> {
  try {
    // First deduplicate structures
    const structuresResult = await mcpDeduplicateStructures(projectId);
    
    // Then deduplicate elements
    const elementsResult = await mcpDeduplicateElements(projectId);
    
    const totalAffected = (structuresResult.affectedCount || 0) + (elementsResult.affectedCount || 0);
    
    return {
      success: structuresResult.success && elementsResult.success,
      message: `Deduplication complete. Removed ${structuresResult.affectedCount || 0} duplicate structure(s) and ${elementsResult.affectedCount || 0} duplicate element(s).`,
      affectedCount: totalAffected
    };
  } catch (error) {
    console.error('Error during deduplication:', error);
    return {
      success: false,
      message: `Error during deduplication: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Helper function to show a notification
export function runDeduplication(projectId: string, onSuccess?: () => void): void {
  toast.promise(
    mcpDeduplicateAll(projectId),
    {
      loading: 'Removing duplicate entries...',
      success: (result) => {
        if (onSuccess && result.affectedCount && result.affectedCount > 0) {
          onSuccess();
        }
        return result.message;
      },
      error: (err) => `Error: ${err.message}`
    }
  );
} 