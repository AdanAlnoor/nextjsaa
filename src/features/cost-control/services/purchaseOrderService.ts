import { createClient } from '@/shared/lib/supabase/client';
import { Database } from '@/shared/types/supabase';

export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];

/**
 * Sets up a real-time subscription to purchase_orders table changes
 * @param callback Function to call when purchase orders are updated
 * @param filters Optional filters to apply to the subscription
 * @returns A function to unsubscribe from the real-time updates
 */
export const subscribeToPurchaseOrders = (
  callback: (payload: { new: PurchaseOrder; old: PurchaseOrder; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void,
  filters?: {
    project_id?: string;
    status?: string;
    ids?: string[];
  }
) => {
  const supabase = createClient();
  
  // Build filter conditions based on provided filters
  let filterConditions = [];
  
  if (filters?.project_id) {
    filterConditions.push(`project_id=eq.${filters.project_id}`);
  }
  
  if (filters?.status) {
    filterConditions.push(`status=eq.${filters.status}`);
  }
  
  if (filters?.ids && filters.ids.length > 0) {
    filterConditions.push(`id=in.(${filters.ids.join(',')})`);
  }
  
  // Create the filter string for Supabase
  const filterString = filterConditions.length > 0 ? filterConditions.join(',') : undefined;
  
  // Subscribe to changes on purchase_orders table
  const channel = supabase
    .channel('purchase-orders-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'purchase_orders',
        ...(filterString ? { filter: filterString } : {})
      },
      (payload) => {
        console.log('Received purchase order update:', payload);
        callback(payload as any);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Fetch purchase orders from the database
 * @param projectId The project ID to filter by
 * @returns Promise with purchase orders array and total count
 */
export const fetchPurchaseOrders = async (projectId: string) => {
  const supabase = createClient();
  
  try {
    // Query purchase orders with supplier information and items
    const { data, error, count } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(
          id,
          name,
          email,
          phone,
          address
        ),
        items:purchase_order_items(*)
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return { data: [], count: 0, error };
  }
}; 