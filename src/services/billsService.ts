import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';
import { eventBus, EVENT_TYPES } from '@/utils/events';

/**
 * Transaction helpers for Supabase
 * These provide a minimal transaction-like interface for Supabase
 */
async function beginTransaction(supabase: any) {
  const { error } = await supabase.rpc('begin_transaction');
  if (error) throw new Error(`Failed to start transaction: ${error.message}`);
}

async function commitTransaction(supabase: any) {
  const { error } = await supabase.rpc('commit_transaction');
  if (error) throw new Error(`Failed to commit transaction: ${error.message}`);
}

async function rollbackTransaction(supabase: any) {
  try {
    await supabase.rpc('rollback_transaction');
  } catch (error) {
    console.error('Error during rollback:', error);
    // Intentionally not re-throwing as this is called in error scenarios
  }
}

// Use this helper to run operations in a transaction
async function withTransaction<T>(supabase: any, operations: (client: any) => Promise<T>): Promise<T> {
  try {
    await beginTransaction(supabase);
    const result = await operations(supabase);
    await commitTransaction(supabase);
    return result;
  } catch (error) {
    await rollbackTransaction(supabase);
    throw error;
  }
}

export type Bill = Database['public']['Tables']['bills']['Row'];
export type BillItem = Database['public']['Tables']['bill_items']['Row'];
export type BillPayment = Database['public']['Tables']['bill_payments']['Row'];
export type BillAttachment = Database['public']['Tables']['bill_attachments']['Row'];

export interface BillWithRelations extends Bill {
  supplier?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  purchase_order?: {
    id: string;
    po_number: string;
  };
  items?: BillItem[];
  payments?: BillPayment[];
  attachments?: BillAttachment[];
}

export interface BillFilters {
  status?: string;
  supplier_id?: string;
  purchase_order_id?: string;
  date_range?: { start: string; end: string };
  search?: string;
}

export interface FetchBillsOptions {
  page?: number;
  pageSize?: number;
  filters?: BillFilters;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  projectId: string;
}

export interface BillsResponse {
  data: BillWithRelations[];
  count: number | null;
}

/**
 * Fetches bills for a project with optional pagination, filtering, and sorting
 */
export const getBills = async (options: FetchBillsOptions): Promise<BillsResponse> => {
  const supabase = createClient();
  const { projectId } = options;
  const pageSize = options?.pageSize || 20;
  const page = options?.page || 1;
  
  let query = supabase
    .from('bills')
    .select(`
      *,
      supplier:supplier_id (id, name),
      purchase_order:purchase_order_id (id, po_number),
      items:bill_items (*),
      payments:bill_payments (*)
    `, { count: 'exact' })
    .eq('project_id', projectId);
  
  // Apply filters
  if (options?.filters) {
    const { status, supplier_id, purchase_order_id, date_range, search } = options.filters;
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }
    
    if (purchase_order_id) {
      query = query.eq('purchase_order_id', purchase_order_id);
    }
    
    if (date_range) {
      if (date_range.start) {
        query = query.gte('issue_date', date_range.start);
      }
      if (date_range.end) {
        query = query.lte('issue_date', date_range.end);
      }
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,bill_number.ilike.%${search}%,bill_reference.ilike.%${search}%`);
    }
  }
  
  // Apply sorting
  if (options?.sortBy) {
    const direction = options.sortDirection || 'desc';
    query = query.order(options.sortBy, { ascending: direction === 'asc' });
  } else {
    // Default sorting
    query = query.order('issue_date', { ascending: false });
  }
  
  // Apply pagination
  if (page && pageSize) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }
  
  return { data: data || [], count };
};

/**
 * Fetches a bill by its ID with all related data (items, payments, etc.)
 */
export const getBillById = async (id: string): Promise<BillWithRelations> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('bills')
    .select(`
      *,
      supplier:supplier_id (id, name),
      project:project_id (id, name),
      purchase_order:purchase_order_id (id, po_number),
      items:bill_items (*),
      payments:bill_payments (*),
      attachments:bill_attachments (*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching bill ${id}:`, error);
    throw error;
  }
  
  return data as BillWithRelations;
};

/**
 * Creates a new bill and its items
 */
export const createBill = async (
  billData: Partial<Bill>, 
  items: Partial<BillItem>[]
): Promise<BillWithRelations> => {
  const supabase = createClient();
  
  console.log("createBill called with data:", billData);
  console.log("Bill items:", items);
  
  // Check auth state before proceeding
  const { data: authData } = await supabase.auth.getSession();
  console.log("Auth status for createBill:", authData.session ? "Authenticated" : "Not authenticated");
  
  if (!authData.session) {
    console.error("Authentication required to create a bill");
    throw new Error("Authentication required. Please sign in and try again.");
  }
  
  // Start a transaction (not directly supported, but we can simulate one)
  try {
    // 1. Insert the bill first - make sure no extra properties are sent to the API
    console.log("Inserting bill record...");
    
    // Create a clean copy of bill data with only valid properties for the bills table
    // This avoids sending properties like cost_control_item_id that don't exist in the table
    const cleanBillData = {
      bill_number: billData.bill_number,
      supplier_id: billData.supplier_id,
      project_id: billData.project_id,
      purchase_order_id: billData.purchase_order_id,
      issue_date: billData.issue_date,
      due_date: billData.due_date,
      bill_reference: billData.bill_reference,
      description: billData.description,
      notes: billData.notes,
      amount: billData.amount,
      status: billData.status,
      name: billData.name
    };
    
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert(cleanBillData)
      .select()
      .single();
    
    if (billError) {
      console.error("Error inserting bill:", billError);
      throw billError;
    }
    
    console.log("Bill inserted successfully:", bill);
    
    // 2. Insert bill items
    let billItems: any[] = [];
    if (items.length > 0) {
      console.log(`Inserting ${items.length} bill items...`);
      
      billItems = items.map(item => ({
        ...item,
        bill_id: bill.id,
        amount: (item.quantity || 1) * (item.unit_cost || 0),
        // Preserve cost control association if it exists
        cost_control_item_id: item.cost_control_item_id || null
      }));
      
      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems);
      
      if (itemsError) {
        console.error("Error inserting bill items:", itemsError);
        throw itemsError;
      }
      
      console.log("Bill items inserted successfully");
    }
    
    // 2a. Update cost control pending bills
    // This step is critical to ensure cost control summary is updated for PO-converted bills
    const costControlItemIds = new Set<string>();
    billItems.forEach(item => {
      if (item.cost_control_item_id) {
        costControlItemIds.add(item.cost_control_item_id);
      }
    });
    
    if (costControlItemIds.size > 0) {
      console.log(`Updating pending_bills for ${costControlItemIds.size} cost control items...`);
      console.time('cost_control_pending_update');
      
      try {
        // Get current cost control items
        const { data: costControlItems, error: costControlError } = await supabase
          .from('cost_control_items')
          .select('*')
          .in('id', Array.from(costControlItemIds));
        
        if (costControlError) {
          console.error("Error fetching cost control items:", costControlError);
          // Continue despite error to maintain bill creation
        } else if (costControlItems && costControlItems.length > 0) {
          console.log(`Found ${costControlItems.length} cost control items to update`);
          
          // Create updates for each cost control item
          const updatePromises = [];
          
          for (const costControlItem of costControlItems) {
            // Get all bill items linked to this cost control item
            const linkedItems = billItems.filter(item => item.cost_control_item_id === costControlItem.id);
            if (linkedItems.length === 0) continue;
            
            // Calculate total amount for this cost control item
            const totalAmount = linkedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            
            console.log(`Updating cost control item ${costControlItem.id} (${costControlItem.name}):`);
            console.log(`- Adding to pending bills: ${totalAmount.toFixed(2)}`);
            
            // Prepare update for this cost control item
            const newPendingBills = (Number(costControlItem.pending_bills) || 0) + totalAmount;
            
            // Add to update queue
            updatePromises.push(
              supabase
                .from('cost_control_items')
                .update({
                  pending_bills: newPendingBills,
                  updated_at: new Date().toISOString()
                })
                .eq('id', costControlItem.id)
            );
          }
          
          // Execute all updates in parallel
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            console.log(`Updated pending_bills for ${updatePromises.length} cost control items`);
          }
          
          // Now update parent items
          const parentIds = new Set<string>();
          costControlItems.forEach(item => {
            if (item.parent_id) parentIds.add(item.parent_id);
          });
          
          if (parentIds.size > 0) {
            console.log(`Updating ${parentIds.size} parent cost control items...`);
            
            for (const parentId of parentIds) {
              // Get all children of this parent
              const { data: children, error: childrenError } = await supabase
                .from('cost_control_items')
                .select('*')
                .eq('parent_id', parentId);
              
              if (childrenError) {
                console.error(`Error fetching children for parent ${parentId}:`, childrenError);
                continue;
              }
              
              if (children && children.length > 0) {
                // Calculate sum of pending bills
                const pendingBillsSum = children.reduce((sum, child) => sum + (Number(child.pending_bills) || 0), 0);
                
                // Update parent
                const { error: parentUpdateError } = await supabase
                  .from('cost_control_items')
                  .update({
                    pending_bills: pendingBillsSum,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', parentId);
                
                if (parentUpdateError) {
                  console.error(`Error updating parent ${parentId}:`, parentUpdateError);
                } else {
                  console.log(`Successfully updated parent ${parentId}`);
                }
              }
            }
          }
        }
      } finally {
        console.timeEnd('cost_control_pending_update');
      }
    }
    
    // 3. Update the purchase order if this bill was created from a PO
    if (billData.purchase_order_id) {
      console.log(`Updating purchase order: ${billData.purchase_order_id}...`);
      
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Billed',
          linked_bill: billData.bill_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', billData.purchase_order_id);
      
      if (poError) {
        console.error('Error updating purchase order:', poError);
        // Continue despite error to maintain bill creation
      } else {
        console.log("Purchase order updated successfully");
      }
    }
    
    // 4. Return the full bill with related data
    console.log("Fetching full bill data...");
    return getBillById(bill.id);
  } catch (error) {
    console.error('Error creating bill:', error);
    throw error;
  }
};

/**
 * Updates an existing bill and its items
 */
export const updateBill = async (
  id: string,
  billData: Partial<Bill>,
  items: Partial<BillItem>[],
  itemsToDelete: string[] = []
): Promise<BillWithRelations> => {
  const supabase = createClient();
  
  console.log(`Updating bill with ID: ${id}`);
  console.log("Bill data:", billData);
  console.log("Items to update:", items);
  console.log("Items to delete:", itemsToDelete);
  
  // Check auth state before proceeding
  const { data: authData } = await supabase.auth.getSession();
  console.log("Auth status for update:", authData.session ? "Authenticated" : "Not authenticated");
  
  if (!authData.session) {
    console.error("Authentication required to update bill");
    throw new Error("Authentication required. Please sign in and try again.");
  }
  
  try {
    // 0. Verify bill exists
    console.log("Verifying bill exists...");
    const { data: existingBill, error: checkError } = await supabase
      .from('bills')
      .select('id')
      .eq('id', id)
      .single();
      
    if (checkError) {
      console.error("Error checking bill existence:", checkError);
      throw new Error(`Bill with ID ${id} not found.`);
    }
    
    console.log("Bill exists, proceeding with update...");
    
    // 1. Update the bill
    console.log("Updating bill record with data:", JSON.stringify(billData));
    const { data: updatedBill, error: billError } = await supabase
      .from('bills')
      .update({
        ...billData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (billError) {
      console.error("Error updating bill:", billError);
      throw billError;
    }
    
    console.log("Bill updated successfully:", updatedBill);
    
    // 2. Delete removed items
    if (itemsToDelete.length > 0) {
      console.log(`Deleting ${itemsToDelete.length} items: ${itemsToDelete.join(', ')}`);
      const { error: deleteError } = await supabase
        .from('bill_items')
        .delete()
        .in('id', itemsToDelete);
      
      if (deleteError) {
        console.error("Error deleting items:", deleteError);
        throw deleteError;
      }
      
      console.log("Items deleted successfully");
    }
    
    // 3. Update existing items and insert new ones
    console.log(`Processing ${items.length} bill items...`);
    const updatedItems = [];
    
    for (const item of items) {
      if (item.id) {
        // Update existing item
        console.log(`Updating existing item ${item.id} with data:`, JSON.stringify(item));
        
        const amount = (Number(item.quantity) || 1) * (Number(item.unit_cost) || 0);
        console.log(`Calculated amount for item: ${amount} = ${item.quantity} × ${item.unit_cost}`);
        
        const { data: updatedItem, error: updateError } = await supabase
          .from('bill_items')
          .update({
            ...item,
            amount: amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
          .select()
          .single();
        
        if (updateError) {
          console.error(`Error updating item ${item.id}:`, updateError);
          throw updateError;
        }
        
        console.log(`Item ${item.id} updated successfully:`, updatedItem);
        updatedItems.push(updatedItem);
      } else {
        // Insert new item
        console.log("Inserting new item with data:", JSON.stringify(item));
        
        const amount = (Number(item.quantity) || 1) * (Number(item.unit_cost) || 0);
        console.log(`Calculated amount for new item: ${amount} = ${item.quantity} × ${item.unit_cost}`);
        
        const { data: newItem, error: insertError } = await supabase
          .from('bill_items')
          .insert({
            ...item,
            bill_id: id,
            amount: amount
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error inserting new item:", insertError);
          throw insertError;
        }
        
        console.log("New item inserted successfully:", newItem);
        updatedItems.push(newItem);
      }
    }
    
    console.log(`Successfully processed ${updatedItems.length} bill items`);
    
    // 4. Return the updated bill with relations
    console.log("Fetching complete updated bill with all relations...");
    return getBillById(id);
  } catch (error) {
    console.error('Error updating bill:', error);
    throw error;
  }
};

/**
 * Records a payment for a bill and updates the bill status
 */
export const recordPayment = async (payment: Partial<BillPayment>): Promise<BillPayment> => {
  const supabase = createClient();
  
  try {
    console.log("Recording payment:", payment);
    
    // 1. Enhanced validation
    if (!payment.bill_id) {
      throw new Error("Bill ID is required to record a payment");
    }
    
    if (!payment.amount || payment.amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }
    
    if (!payment.payment_date) {
      // Store dates in ISO format to avoid timezone issues
      payment.payment_date = new Date().toISOString().split('T')[0];
    }
    
    if (!payment.payment_method || payment.payment_method.trim() === '') {
      console.error("Payment method validation failed:", payment);
      throw new Error("Payment method is required. Please select a valid payment method.");
    }
    
    // Check auth state before proceeding
    const { data: authData } = await supabase.auth.getSession();
    console.log("Auth status:", authData.session ? "Authenticated" : "Not authenticated");
    
    if (!authData.session) {
      console.error("Authentication required to record payment");
      throw new Error("Authentication required. Please sign in and try again.");
    }
    
    // 2. Get the current bill details
    console.log(`Fetching bill details for bill ID ${payment.bill_id}`);
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*, items:bill_items(*)')
      .eq('id', payment.bill_id)
      .single();
    
    if (billError) {
      console.error("Error fetching bill:", billError);
      throw billError;
    }
    
    console.log("Current bill data:", bill);
    
    // 3. Get all existing payments
    console.log(`Fetching all payments for bill ID ${payment.bill_id}`);
    const { data: payments, error: paymentsError } = await supabase
      .from('bill_payments')
      .select('amount')
      .eq('bill_id', payment.bill_id);
    
    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      throw paymentsError;
    }
    
    // 4. Calculate total paid amount and validate payment amount
    const existingPaymentsTotal = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const billAmount = Number(bill.amount) || 0;
    const remainingAmount = billAmount - existingPaymentsTotal;
    
    if (Number(payment.amount) > remainingAmount) {
      console.error(`Payment amount ${payment.amount} exceeds remaining balance ${remainingAmount}`);
      throw new Error(`Payment exceeds remaining balance of $${remainingAmount.toFixed(2)}`);
    }
    
    // 5. Insert the payment
    console.log("Inserting payment record with data:", JSON.stringify(payment));
    const { data: newPayment, error: paymentError } = await supabase
      .from('bill_payments')
      .insert({
        ...payment,
        status: 'Completed'
      })
      .select()
      .single();
    
    if (paymentError) {
      console.error("Error inserting payment:", paymentError);
      throw paymentError;
    }
    
    console.log("Payment record created successfully:", newPayment);
    
    // 6. Calculate new totals
    const totalPaid = existingPaymentsTotal + Number(payment.amount);
    
    console.log(`Total bill amount: ${billAmount}, Previous payments: ${existingPaymentsTotal}, New payment: ${payment.amount}, Total paid: ${totalPaid}`);
    
    // 7. Determine new status
    let status = 'Pending';
    if (totalPaid >= billAmount) {
      status = 'Paid';
    } else if (totalPaid > 0) {
      status = 'Partial';
    }
    
    console.log(`Updating bill status to ${status}`);
    
    // 8. Update bill status
    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update({
        status,
        paid_amount: totalPaid,
        remaining_amount: billAmount - totalPaid,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.bill_id)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating bill status:", updateError);
      throw updateError;
    }
    
    console.log("Bill updated successfully:", updatedBill);
    
    // 9. Update cost control items
    // First get the cost control associations for this bill's items
    const billItems = bill.items || [];
    const costControlUpdates = [];
    
    // Get unique cost control item IDs associated with this bill
    const costControlItemIds = new Set();
    for (const item of billItems) {
      if (item.cost_control_item_id) {
        costControlItemIds.add(item.cost_control_item_id);
      }
    }
    
    if (costControlItemIds.size > 0) {
      console.log(`Updating ${costControlItemIds.size} cost control items for payment of ${payment.amount}`);
      console.time('cost_control_update');
      
      try {
        // Get current cost control items in a single query
        const { data: costControlItems, error: costControlError } = await supabase
          .from('cost_control_items')
          .select('*')
          .in('id', Array.from(costControlItemIds));
        
        // Type for cost control items from database
        type CostControlItemRow = Database['public']['Tables']['cost_control_items']['Row'];
        
        if (costControlError) {
          console.error("Error fetching cost control items:", costControlError);
          // Continue despite error to maintain payment recording
        } else if (costControlItems && costControlItems.length > 0) {
          console.log(`Successfully fetched ${costControlItems.length} cost control items`);
          
          // Calculate item updates
          const updatePromises = [];
          
          // 1. First pass: Update child items
          for (const item of costControlItems as CostControlItemRow[]) {
            // Skip parent items in first pass
            if (item.is_parent) continue;
            
            // Calculate how much of the payment should be attributed to this item
            const relatedBillItems = billItems.filter((bi: any) => bi.cost_control_item_id === item.id);
            const itemTotal = relatedBillItems.reduce((sum: number, bi: any) => sum + (Number(bi.amount) || 0), 0);
            const proportion = itemTotal / billAmount;
            const attributedPayment = Number(payment.amount) * proportion;
            
            console.log(`Updating cost control item ${item.id} (${item.name}):`);
            console.log(`- Attributed payment: ${attributedPayment.toFixed(2)}`);
            
            // Prepare updates for this cost control item
            const newPaidBills = (Number(item.paid_bills) || 0) + attributedPayment;
            const newPendingBills = status === 'Paid' ? 
              (Number(item.pending_bills) || 0) - itemTotal : 
              (Number(item.pending_bills) || 0) - attributedPayment;
            
            // Calculate new actual amount as sum of paid bills, external bills, and wages
            const newActual = newPaidBills + 
              (Number(item.external_bills) || 0) + 
              (Number(item.wages) || 0);
            
            const updates = {
              paid_bills: newPaidBills,
              pending_bills: Math.max(0, newPendingBills), // Ensure we don't go negative
              actual_amount: newActual,
              updated_at: new Date().toISOString()
            };
            
            // Add to the updates to be processed
            costControlUpdates.push({
              id: item.id,
              updates,
              parentId: item.parent_id
            });
          }
          
          // 2. Batch update all child items
          if (costControlUpdates.length > 0) {
            console.log(`Batch updating ${costControlUpdates.length} child cost control items`);
            
            // Process updates in batches of 10 for better performance
            const BATCH_SIZE = 10;
            for (let i = 0; i < costControlUpdates.length; i += BATCH_SIZE) {
              const batch = costControlUpdates.slice(i, i + BATCH_SIZE);
              
              // Create a batch of promises for parallel execution
              const batchPromises = batch.map(update => 
                supabase
                  .from('cost_control_items')
                  .update(update.updates)
                  .eq('id', update.id)
              );
              
              // Wait for all updates in this batch to complete
              await Promise.all(batchPromises);
              console.log(`Completed batch ${i / BATCH_SIZE + 1} of child updates`);
            }
          }
          
          // 3. Now update parent items based on updated children
          // Collect all unique parent IDs
          const parentIds = new Set<string>();
          costControlUpdates.forEach(update => {
            if (update.parentId) parentIds.add(update.parentId);
          });
          
          if (parentIds.size > 0) {
            console.log(`Updating ${parentIds.size} parent cost control items`);
            
            // Get all parents and their children in a single efficient query
            const { data: parentItems, error: parentsError } = await supabase
              .from('cost_control_items')
              .select('id, parent_id, is_parent')
              .in('id', Array.from(parentIds))
              .eq('is_parent', true);
            
            if (parentsError) {
              console.error('Error fetching parent items:', parentsError);
            } else if (parentItems && parentItems.length > 0) {
              console.log(`Found ${parentItems.length} parent items to update`);
              
              // Process each parent item
              for (const parentId of parentIds) {
                // Get all children of this parent
                const { data: children, error: childrenError } = await supabase
                  .from('cost_control_items')
                  .select('*')
                  .eq('parent_id', parentId);
                
                if (childrenError) {
                  console.error(`Error fetching children for parent ${parentId}:`, childrenError);
                  continue;
                }
                
                if (children && children.length > 0) {
                  // Calculate sums using proper type casting to avoid property errors
                  const childItems = children as CostControlItemRow[];
                  const paidBillsSum = childItems.reduce((sum: number, child) => sum + (Number(child.paid_bills) || 0), 0);
                  const pendingBillsSum = childItems.reduce((sum: number, child) => sum + (Number(child.pending_bills) || 0), 0);
                  const externalBillsSum = childItems.reduce((sum: number, child) => sum + (Number(child.external_bills) || 0), 0);
                  const wagesSum = childItems.reduce((sum: number, child) => sum + (Number(child.wages) || 0), 0);
                  
                  // Calculate actual amount as sum of all components
                  const actualAmountSum = paidBillsSum + externalBillsSum + wagesSum;
                  
                  console.log(`Updating parent ${parentId}:`);
                  console.log(`- Paid bills: ${paidBillsSum.toFixed(2)}`);
                  console.log(`- Calculated actual: ${actualAmountSum.toFixed(2)}`);
                  
                  // Update parent
                  const { data: updatedParent, error: parentUpdateError } = await supabase
                    .from('cost_control_items')
                    .update({
                      paid_bills: paidBillsSum,
                      pending_bills: pendingBillsSum,
                      actual_amount: actualAmountSum,
                      external_bills: externalBillsSum,
                      wages: wagesSum,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', parentId)
                    .select();
                  
                  if (parentUpdateError) {
                    console.error(`Error updating parent ${parentId}:`, parentUpdateError);
                  } else {
                    console.log(`Successfully updated parent ${parentId}`);
                  }
                }
              }
            }
          }
        }
      } finally {
        console.timeEnd('cost_control_update');
      }
    }
    
    // Add payment audit entry
    try {
      await supabase.from('activity_log').insert({
        user_id: authData.session.user.id,
        action: 'payment_recorded',
        resource_type: 'bill',
        resource_id: payment.bill_id,
        details: JSON.stringify({
          payment_id: newPayment.id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          new_status: status
        }),
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error("Error logging payment activity:", logError);
      // Continue despite error to maintain payment recording
    }
    
    console.log("Payment recorded successfully");
    
    // Emit event to notify cost control components that data has changed
    eventBus.emit(EVENT_TYPES.BILL_PAYMENT_RECORDED, {
      billId: payment.bill_id,
      amount: payment.amount,
      costControlItemIds: Array.from(costControlItemIds),
      timestamp: new Date().toISOString()
    });
    
    return newPayment as BillPayment;
  } catch (error) {
    console.error('Error recording payment:', error);
    
    // Log detailed error information for recovery
    try {
      await supabase.from('error_logs').insert({
        operation: 'record_payment',
        data: JSON.stringify(payment),
        error_message: (error as Error).message || 'Unknown error',
        error_details: JSON.stringify(error),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    throw error;
  }
};

/**
 * Deletes a bill and all related records (items, payments, attachments)
 */
export const deleteBill = async (id: string): Promise<void> => {
  const supabase = createClient();
  
  console.log(`Deleting bill with ID: ${id}`);
  
  // Check auth state before proceeding
  const { data: authData } = await supabase.auth.getSession();
  console.log("Auth status for delete:", authData.session ? "Authenticated" : "Not authenticated");
  
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting bill:', error);
    throw error;
  }
  
  console.log(`Bill ${id} deleted successfully`);
};

/**
 * Uploads a file attachment for a bill
 */
export const uploadBillAttachment = async (
  billId: string,
  file: File
): Promise<BillAttachment> => {
  const supabase = createClient();
  
  try {
    // 1. Upload file to Storage
    const filePath = `bills/${billId}/${file.name}`;
    const { error: uploadError } = await supabase
      .storage
      .from('attachments')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    // 2. Get public URL for the file
    const { data: publicUrlData } = supabase
      .storage
      .from('attachments')
      .getPublicUrl(filePath);
    
    // 3. Create attachment record
    const attachmentData = {
      bill_id: billId,
      file_name: file.name,
      file_path: publicUrlData.publicUrl,
      file_type: file.type,
      file_size: file.size
    };
    
    const { data, error } = await supabase
      .from('bill_attachments')
      .insert(attachmentData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as BillAttachment;
  } catch (error) {
    console.error('Error uploading bill attachment:', error);
    throw error;
  }
};

/**
 * Creates a bill from a purchase order
 */
export const createBillFromPurchaseOrder = async (
  poId: string,
  billData: Partial<Bill>
): Promise<BillWithRelations> => {
  const supabase = createClient();
  
  try {
    // 1. Get purchase order data
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', poId)
      .single();
    
    if (poError) throw poError;
    
    // 2. Get purchase order items
    const { data: poItems, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('*, cost_control_item_id')
      .eq('purchase_order_id', poId);
    
    if (itemsError) throw itemsError;

    // Log cost control associations for debugging
    console.log('PO items with cost control associations:');
    const hasCostControlAssociations = poItems.some(item => item.cost_control_item_id);
    console.log(`Found ${poItems.length} PO items, ${hasCostControlAssociations ? 'with' : 'without'} cost control associations`);
    
    // Extract and count unique cost control item IDs
    const costControlItemIds = new Set<string>();
    poItems.forEach(item => {
      if (item.cost_control_item_id) {
        costControlItemIds.add(item.cost_control_item_id);
        console.log(`PO item: ${item.description} has cost control ID: ${item.cost_control_item_id}`);
      }
    });
    console.log(`Total unique cost control items: ${costControlItemIds.size}`);
    
    // 3. Generate a sequential bill number
    const billNumber = await generateBillNumber(po.project_id);
    console.log(`Generated bill number for PO conversion: ${billNumber}`);
    
    // 4. Prepare bill data
    const billDataToCreate: Partial<Bill> = {
      ...billData,
      bill_number: billNumber, // Use the generated bill number
      purchase_order_id: poId,
      supplier_id: po.supplier_id,
      project_id: po.project_id,
      amount: po.total,
      status: 'Pending'
    };
    
    // 5. Prepare bill items from PO items - explicitly handle cost control items
    const billItems: Partial<BillItem>[] = poItems.map(item => {
      // Explicitly verify and log cost control association
      if (item.cost_control_item_id) {
        console.log(`Creating bill item with cost control association: ${item.cost_control_item_id}`);
      }
      
      return {
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.price || item.unit_cost,
        amount: item.amount,
        internal_note: item.internal_note,
        cost_control_item_id: item.cost_control_item_id || null
      };
    });
    
    // 6. Create the bill with items
    const createdBill = await createBill(billDataToCreate, billItems);
    
    // 7. Additional verification after bill creation
    if (costControlItemIds.size > 0) {
      console.log(`Verifying cost control associations for new bill ${createdBill.id}`);
      const { data: createdItems } = await supabase
        .from('bill_items')
        .select('cost_control_item_id')
        .eq('bill_id', createdBill.id);
      
      if (createdItems) {
        const successfulAssociations = createdItems.filter(item => item.cost_control_item_id).length;
        console.log(`Cost control verification: ${successfulAssociations} items with cost control associations created`);
      }
    }
    
    return createdBill;
  } catch (error) {
    console.error('Error creating bill from purchase order:', error);
    throw error;
  }
};

/**
 * Generates a unique bill number by combining project number and a sequential bill counter
 */
export const generateBillNumber = async (projectId: string): Promise<string> => {
  const supabase = createClient();
  
  try {
    console.log(`Generating bill number for project ${projectId}`);
    
    // 1. Get the project number first
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('project_number')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error("Error fetching project details:", projectError);
      throw projectError;
    }
    
    // Use project number or fallback to a default if not available
    const projectNumber = project?.project_number || 'P0000';
    console.log(`Using project number: ${projectNumber}`);
    
    // 2. Count all bills for the project to get the next sequential number
    const { count, error: countError } = await supabase
      .from('bills')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);
    
    if (countError) throw countError;
    
    // Next number is the count + 1 (for the new bill being created)
    const nextNumber = (count || 0) + 1;
    console.log(`Total bills for project: ${count}, next bill sequence: ${nextNumber}`);
    
    // Format bill number as PROJECT-B-BILL (e.g., P1001-B-001)
    // The "B" clearly identifies this as a Bill
    const formatted = `${projectNumber}-B-${nextNumber.toString().padStart(3, '0')}`;
    console.log(`Generated combined bill number: ${formatted}`);
    return formatted;
  } catch (error) {
    console.error('Error generating bill number:', error);
    // Fallback to a predictable default with proper formatting
    return `BILL-00001`;
  }
};

/**
 * Duplicates an existing bill with its items
 * Creates a new bill with the same details but a new bill number
 */
export const duplicateBill = async (billId: string): Promise<BillWithRelations> => {
  const supabase = createClient();
  
  try {
    // 1. Get the original bill
    const sourceBill = await getBillById(billId);
    
    // 2. Generate a new bill number
    const newBillNumber = await generateBillNumber(sourceBill.project_id);
    
    // 3. Prepare new bill data (omitting unique identifiers and payment-related fields)
    const newBillData: Partial<Bill> = {
      project_id: sourceBill.project_id,
      supplier_id: sourceBill.supplier_id,
      purchase_order_id: sourceBill.purchase_order_id,
      bill_number: newBillNumber,
      name: sourceBill.name ? `Copy of ${sourceBill.name}` : `Copy of ${sourceBill.bill_number}`,
      bill_reference: sourceBill.bill_reference ? `Copy of ${sourceBill.bill_reference}` : '',
      description: sourceBill.description,
      notes: sourceBill.notes,
      amount: sourceBill.amount,
      issue_date: new Date().toISOString().split('T')[0], // Today's date
      due_date: '', // Reset due date to be set by user
      status: 'Pending', // Reset status
    };
    
    // 4. Prepare bill items (omitting ids)
    const newItems: Partial<BillItem>[] = [];
    if (sourceBill.items && sourceBill.items.length > 0) {
      sourceBill.items.forEach(item => {
        newItems.push({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          amount: item.amount
        });
      });
    }
    
    // 5. Create the new bill with duplicated items
    console.log("Creating duplicated bill:", newBillData);
    const newBill = await createBill(newBillData, newItems);
    
    console.log("Bill duplicated successfully:", newBill);
    return newBill;
  } catch (error) {
    console.error('Error duplicating bill:', error);
    throw error;
  }
}; 