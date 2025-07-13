import { createClient } from '@/shared/lib/supabase/client';

/**
 * This script checks the database connection and verifies purchase order tables
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/debug-purchase-orders.ts
 */
async function debugPurchaseOrders() {
  console.log('Debugging Purchase Orders functionality...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient();
    console.log('Supabase client initialized');
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Authentication error:', authError.message);
      return;
    }
    
    if (!authData.session) {
      console.error('No active session. Please login first.');
      return;
    }
    
    console.log('Authentication verified ✓');
    
    // Check purchase_orders table
    const { data: purchaseOrdersData, error: purchaseOrdersError } = await supabase
      .from('purchase_orders')
      .select('id')
      .limit(1);
    
    if (purchaseOrdersError) {
      console.error('Error accessing purchase_orders table:', purchaseOrdersError.message);
      console.error('This could indicate the table doesn\'t exist or you don\'t have permissions');
      return;
    }
    
    console.log('purchase_orders table accessible ✓');
    console.log(`Found ${purchaseOrdersData.length} purchase orders`);
    
    // Check purchase_order_items table
    const { data: itemsData, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('id')
      .limit(1);
    
    if (itemsError) {
      console.error('Error accessing purchase_order_items table:', itemsError.message);
      console.error('This could indicate the table doesn\'t exist or you don\'t have permissions');
      return;
    }
    
    console.log('purchase_order_items table accessible ✓');
    console.log(`Found ${itemsData.length} purchase order items`);
    
    // Check user permissions
    const userId = authData.session.user.id;
    
    console.log('Checking user permissions...');
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (rolesError) {
      console.error('Error accessing user_roles:', rolesError.message);
    } else {
      console.log('User roles:', userRoles.map(r => r.role).join(', ') || 'No roles found');
    }
    
    console.log('Debug complete');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the debug function
debugPurchaseOrders(); 