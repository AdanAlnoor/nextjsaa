export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bills: {
        Row: {
          id: string
          bill_number: string
          name: string | null
          bill_reference: string | null
          supplier_id: string | null
          project_id: string
          purchase_order_id: string | null
          amount: number
          issue_date: string
          due_date: string
          status: string
          payment_date: string | null
          payment_amount: number | null
          payment_reference: string | null
          description: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bill_number: string
          name?: string | null
          bill_reference?: string | null
          supplier_id?: string | null
          project_id: string
          purchase_order_id?: string | null
          amount: number
          issue_date: string
          due_date: string
          status?: string
          payment_date?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          description?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bill_number?: string
          name?: string | null
          bill_reference?: string | null
          supplier_id?: string | null
          project_id?: string
          purchase_order_id?: string | null
          amount?: number
          issue_date?: string
          due_date?: string
          status?: string
          payment_date?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          description?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bill_items: {
        Row: {
          id: string
          bill_id: string
          type: string | null
          description: string
          cost_code: string | null
          cost_code_id: string | null
          quantity: number
          unit: string | null
          unit_cost: number
          amount: number
          internal_note: string | null
          cost_control_item_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          type?: string | null
          description: string
          cost_code?: string | null
          cost_code_id?: string | null
          quantity?: number
          unit?: string | null
          unit_cost?: number
          amount?: number
          internal_note?: string | null
          cost_control_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          type?: string | null
          description?: string
          cost_code?: string | null
          cost_code_id?: string | null
          quantity?: number
          unit?: string | null
          unit_cost?: number
          amount?: number
          internal_note?: string | null
          cost_control_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bill_payments: {
        Row: {
          id: string
          bill_id: string
          amount: number
          payment_date: string
          payment_method: string | null
          reference: string | null
          note: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          amount: number
          payment_date: string
          payment_method?: string | null
          reference?: string | null
          note?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          note?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      bill_attachments: {
        Row: {
          id: string
          bill_id: string
          file_name: string
          file_path: string
          file_type: string | null
          file_size: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          file_name: string
          file_path: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          name: string
          assigned_to: string
          description: string | null
          total: number
          paid_bills: number
          due_bills: number
          status: string
          project_id: string | null
          created_at: string
          updated_at: string
          approval_date: string | null
          approval_notes: string | null
          rejection_reason: string | null
          rejection_date: string | null
          linked_bill: string | null
        }
        Insert: {
          id?: string
          po_number: string
          name: string
          assigned_to: string
          description?: string | null
          total: number
          paid_bills?: number
          due_bills?: number
          status?: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
          approval_date?: string | null
          approval_notes?: string | null
          rejection_reason?: string | null
          rejection_date?: string | null
          linked_bill?: string | null
        }
        Update: {
          id?: string
          po_number?: string
          name?: string
          assigned_to?: string
          description?: string | null
          total?: number
          paid_bills?: number
          due_bills?: number
          status?: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
          approval_date?: string | null
          approval_notes?: string | null
          rejection_reason?: string | null
          rejection_date?: string | null
          linked_bill?: string | null
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          description: string
          quantity: number
          unit: string
          price: number
          unit_cost: number /* @deprecated use price instead */
          amount: number
          internal_note: string | null
          name: string | null /* @deprecated use internal_note instead */
          cost_control_item_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          description: string
          quantity: number
          unit: string
          price: number
          unit_cost?: number /* @deprecated use price instead */
          amount: number
          internal_note?: string | null
          name?: string | null /* @deprecated use internal_note instead */
          cost_control_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          description?: string
          quantity?: number
          unit?: string
          price?: number
          unit_cost?: number /* @deprecated use price instead */
          amount?: number
          internal_note?: string | null
          name?: string | null /* @deprecated use internal_note instead */
          cost_control_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cost_control_items: {
        Row: {
          id: string
          name: string
          bo_amount: number
          actual_amount: number
          paid_bills: number
          external_bills: number
          pending_bills: number
          wages: number
          is_parent: boolean
          level: number
          order_index: number
          parent_id: string | null
          project_id: string
          imported_from_estimate: boolean
          import_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          bo_amount: number
          actual_amount?: number
          paid_bills?: number
          external_bills?: number
          pending_bills?: number
          wages?: number
          is_parent: boolean
          level: number
          order_index: number
          parent_id?: string | null
          project_id: string
          imported_from_estimate?: boolean
          import_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          bo_amount?: number
          actual_amount?: number
          paid_bills?: number
          external_bills?: number
          pending_bills?: number
          wages?: number
          is_parent?: boolean
          level?: number
          order_index?: number
          parent_id?: string | null
          project_id?: string
          imported_from_estimate?: boolean
          import_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string  // This will be UUID after migration
          name: string
          project_number: string
          status: string
          created_at: string
          updated_at: string
          client: string | null
          text_id: string | null  // The original text-based ID for backward compatibility
        }
        Insert: {
          id?: string  // UUID can be generated by the database
          name: string
          project_number: string
          status: string
          created_at?: string
          updated_at?: string
          client?: string | null
          text_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          project_number?: string
          status?: string
          created_at?: string
          updated_at?: string
          client?: string | null
          text_id?: string | null
        }
      }
      estimate_items: {
        Row: {
          id: string
          name: string
          description: string | null
          quantity: number
          unit: string
          unit_cost: number
          amount: number
          is_parent: boolean
          level: number
          order: number
          parent_id: string | null
          project_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          quantity: number
          unit: string
          unit_cost: number
          amount?: number
          is_parent: boolean
          level: number
          order: number
          parent_id?: string | null
          project_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          quantity?: number
          unit?: string
          unit_cost?: number
          amount?: number
          is_parent?: boolean
          level?: number
          order?: number
          parent_id?: string | null
          project_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      costlines: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      costline_items: {
        Row: {
          id: string
          purchase_order_id: string
          costline_id: string | null
          name: string | null
          description: string | null
          quantity: number
          unit: string
          price: number
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          costline_id?: string | null
          name?: string | null
          description?: string | null
          quantity: number
          unit: string
          price: number
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          costline_id?: string | null
          name?: string | null
          description?: string | null
          quantity?: number
          unit?: string
          price?: number
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Define CostControlItem type
export type CostControlItem = {
  id: string
  name: string
  bo_amount: number
  actual_amount: number
  paid_bills: number
  external_bills: number
  pending_bills: number
  wages: number
  is_parent: boolean
  level: number
  order_index: number
  parent_id: string | null
  project_id: string
  imported_from_estimate?: boolean
  import_date?: string | null
  estimate_item_id?: string
  is_deleted?: boolean
}

// CostControlData interface for UI components
export interface CostControlData {
  id: string
  name: string
  boAmount: number
  actual: number
  difference: number
  paidBills: number
  externalBills: number
  pendingBills: number
  wages: number
  isParent: boolean
  isOpen: boolean
  level?: number
  parentId?: string | null
  orderIndex?: number
  projectId?: string
  importedFromEstimate?: boolean
  importDate?: string
  children?: string[]
}

// Add the missing mapDbToCostControlData function
export function mapDbToCostControlData(item: CostControlItem) {
  if (!item) {
    console.error("mapDbToCostControlData received null or undefined item");
    return {
      id: 'unknown',
      name: 'Error: Invalid item',
      boAmount: 0,
      actual: 0,
      difference: 0,
      paidBills: 0,
      externalBills: 0,
      pendingBills: 0,
      wages: 0,
      isParent: false,
      isOpen: false
    };
  }
  
  return {
    id: item.id || 'unknown',
    name: item.name || 'Unnamed Item',
    boAmount: typeof item.bo_amount === 'number' ? item.bo_amount : 0,
    actual: calculateActualAmount(item),
    difference: (typeof item.bo_amount === 'number' ? item.bo_amount : 0) - 
                calculateActualAmount(item),
    paidBills: typeof item.paid_bills === 'number' ? item.paid_bills : 0,
    externalBills: typeof item.external_bills === 'number' ? item.external_bills : 0,
    pendingBills: typeof item.pending_bills === 'number' ? item.pending_bills : 0,
    wages: typeof item.wages === 'number' ? item.wages : 0,
    isParent: !!item.is_parent,
    isOpen: !!item.is_parent,
    level: typeof item.level === 'number' ? item.level : 0,
    parentId: item.parent_id || null,
    orderIndex: typeof item.order_index === 'number' ? item.order_index : 0,
    projectId: item.project_id || '',
    importedFromEstimate: !!item.imported_from_estimate,
    importDate: item.import_date || undefined
  };
}

// Helper function to calculate actual amount
function calculateActualAmount(item: CostControlItem): number {
  const paidBills = typeof item.paid_bills === 'number' ? item.paid_bills : 0;
  const externalBills = typeof item.external_bills === 'number' ? item.external_bills : 0;
  const wages = typeof item.wages === 'number' ? item.wages : 0;
  
  console.log(`Calculating actual amount for ${item.name}: paid_bills=${paidBills}, external_bills=${externalBills}, wages=${wages}`);
  
  // Actual amount is the sum of paid bills, external bills, and wages
  return paidBills + externalBills + wages;
}
