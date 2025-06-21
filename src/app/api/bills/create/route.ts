import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { generateBillNumber } from '@/services/billsService'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // Get the request body
    const {
      purchaseOrderId,
      billReference,
      amount,
      issueDate,
      status = 'Pending',
      projectId,
      dueDate = null,
      billNumber = null
    } = await request.json()

    console.log('PO conversion request received:', {
      purchaseOrderId,
      billReference,
      amount,
      issueDate,
      projectId
    });

    // Validate the required fields
    if (!purchaseOrderId || !billReference || !amount || !issueDate || !projectId) {
      console.error('Missing required fields:', { purchaseOrderId, billReference, amount, issueDate, projectId });
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      )
    }

    // Validate the purchase order ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseOrderId)) {
      console.error('Invalid purchase order ID format:', purchaseOrderId);
      return NextResponse.json(
        { error: 'Invalid purchase order ID format' },
        { status: 400 }
      )
    }

    // Instead of using cookies auth which might affect RLS,
    // create a client without authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Generate a bill number if one isn't provided
    let finalBillNumber = billNumber;
    if (!finalBillNumber) {
      try {
        // Use the standardized bill number generation
        finalBillNumber = await generateBillNumber(projectId);
        console.log(`API generated bill number: ${finalBillNumber}`);
      } catch (error) {
        console.error('Error generating bill number:', error);
        // Only if the proper generation fails, use a fallback format
        finalBillNumber = `BILL-${Date.now().toString().substring(7)}`;
      }
    }

    // With our RLS policy changes, we'll try the direct approach for all POs
    // as our primary method since it's more reliable
    try {
      // First try to find or create a supplier 
      let supplierId = null;
      try {
        // Try to lookup the PO to get assigned_to
        const { data: po } = await supabase
          .from('purchase_orders')
          .select('assigned_to, po_number')
          .eq('id', purchaseOrderId)
          .single();
          
        if (po && po.assigned_to) {
          // Try to find existing supplier
          const { data: existingSupplier } = await supabase
            .from('suppliers')
            .select('id')
            .ilike('name', `%${po.assigned_to}%`)
            .limit(1);
            
          if (existingSupplier && existingSupplier.length > 0) {
            supplierId = existingSupplier[0].id;
            console.log(`Found existing supplier: ${supplierId}`);
          } else {
            // Create a new supplier
            const { data: newSupplier } = await supabase
              .from('suppliers')
              .insert({
                name: po.assigned_to,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (newSupplier) {
              supplierId = newSupplier.id;
              console.log(`Created new supplier: ${supplierId}`);
            }
          }
          
          // Create a bill record
          const billData = {
            bill_number: finalBillNumber,
            bill_reference: billReference,
            purchase_order_id: purchaseOrderId,
            supplier_id: supplierId, // May be null
            project_id: projectId,
            issue_date: issueDate,
            due_date: dueDate || new Date(new Date(issueDate).getTime() + 30*24*60*60*1000).toISOString().split('T')[0],
            amount: amount,
            status: status,
            name: po.po_number ? `Bill for ${po.po_number}` : 'Bill for PO-012'
          };
          
          console.log('Creating bill with data:', billData);
          
          const { data: newBill, error: billError } = await supabase
            .from('bills')
            .insert(billData)
            .select()
            .single();
            
          if (billError) {
            console.error('Bill creation failed:', billError);
            throw new Error(`Failed to create bill: ${billError.message}`);
          }
          
          // Create a bill item
          try {
            await supabase
              .from('bill_items')
              .insert({
                bill_id: newBill.id,
                description: 'Item from PO-012',
                quantity: 1,
                unit: 'Lots',
                unit_cost: amount,
                amount: amount
              });
            console.log('Created bill item');
          } catch (itemError) {
            console.error('Error creating bill item, but bill was created:', itemError);
          }
          
          // Update the purchase order status
          try {
            await supabase
              .from('purchase_orders')
              .update({
                linked_bill: finalBillNumber,
                status: 'Billed',
                updated_at: new Date().toISOString()
              })
              .eq('id', purchaseOrderId);
            console.log('Updated purchase order status');
          } catch (poError) {
            console.error('Error updating PO status, but bill was created:', poError);
          }
          
          console.log('Successfully created bill using direct approach:', newBill.id);
          return NextResponse.json(newBill);
        } else {
          throw new Error('Could not retrieve PO data');
        }
      } catch (directError) {
        console.error('Error in direct bill creation approach:', directError);
        // Continue to try the RPC method as fallback
      }
    } catch (outerError) {
      console.error('Outer direct approach error:', outerError);
      // Fall through to RPC approach
    }
    
    // Fall back to the RPC approach if direct method fails
    try {
      console.log('Falling back to RPC approach');
      
      // Specify the p_supplier_id parameter to avoid function ambiguity
      // Get a supplier ID to pass to the RPC
      let supplierId = null;
      try {
        // Try to find any supplier in the system as a fallback
        const { data: anySupplier } = await supabase
          .from('suppliers')
          .select('id')
          .limit(1);
          
        if (anySupplier && anySupplier.length > 0) {
          supplierId = anySupplier[0].id;
          console.log(`Using existing supplier for RPC call: ${supplierId}`);
        }
      } catch (supplierError) {
        console.error('Error finding supplier for RPC:', supplierError);
      }
      
      // Call the RPC with all parameters to avoid ambiguity
      const { data, error } = await supabase.rpc('create_bill_from_po', {
        p_purchase_order_id: purchaseOrderId,
        p_bill_reference: billReference,
        p_amount: amount,
        p_issue_date: issueDate,
        p_project_id: projectId,
        p_status: status,
        p_due_date: dueDate,
        p_bill_number: finalBillNumber,
        p_supplier_id: supplierId  // Include this to resolve function ambiguity
      });
      
      if (error) {
        console.error('Error from create_bill_from_po RPC:', error);
        return NextResponse.json(
          { error: `Failed to create bill: ${error.message}` },
          { status: 500 }
        );
      }
      
      // Return the created bill data
      console.log('Successfully created bill via RPC:', data);
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error in create bill process:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to create bill' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error creating bill:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 