// Phase 3 types for the application

export interface BillWithRelations {
  id: string
  bill_number: string
  bill_reference?: string
  name?: string
  description?: string
  notes?: string
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled'
  amount: number
  due_date?: string
  created_at: string
  updated_at: string
  project_id: string
  supplier_id?: string
  purchase_order_id?: string
  
  // Relations
  project?: {
    id: string
    name: string
  }
  supplier?: {
    id: string
    name: string
  }
  purchase_order?: {
    id: string
    po_number: string
  }
}

export interface ProjectBillSummary {
  project_id: string
  project_name: string
  total_bills: number
  total_amount: number
  paid_amount: number
  pending_amount: number
  overdue_amount: number
}

export interface BillItem {
  id: string
  bill_id: string
  description: string
  quantity: number
  unit_price: number
  total_amount: number
  created_at: string
}

export interface BillPayment {
  id: string
  bill_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference?: string
  notes?: string
  created_at: string
}

export interface BillStatusHistory {
  id: string
  bill_id: string
  old_status: string
  new_status: string
  changed_by: string
  changed_at: string
  notes?: string
}

// Filters and search types
export interface BillFilters {
  status?: string[]
  project_id?: string
  supplier_id?: string
  date_range?: {
    start: string
    end: string
  }
  amount_range?: {
    min: number
    max: number
  }
}

export interface BillSearchParams {
  query?: string
  filters?: BillFilters
  sort_by?: 'bill_number' | 'amount' | 'due_date' | 'created_at'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// API response types
export interface BillListResponse {
  bills: BillWithRelations[]
  total_count: number
  has_more: boolean
}

export interface BillCreateData {
  bill_number: string
  bill_reference?: string
  name?: string
  description?: string
  notes?: string
  amount: number
  due_date?: string
  project_id: string
  supplier_id?: string
  purchase_order_id?: string
  status?: 'draft' | 'pending'
}

// Analytics types
export interface AnalyticsFilter {
  dateRange?: {
    start: string
    end: string
  }
  projectIds?: string[]
  projects?: string[]
  costItems?: string[]
  categories?: string[]
  suppliers?: string[]
}

export interface AnalyticsDashboardProps {
  projectId?: string
  dateRange?: {
    start: string
    end: string
  }
}

// Chart data types - using flexible interface for analytics data
export interface BudgetUtilizationData {
  category: string
  budget: number
  spent: number
  remaining: number
  percentage: number
  [key: string]: any // Allow any additional properties for flexibility
}

export interface ChartProps {
  data: any[]
  className?: string
  title?: string
  description?: string
  height?: number
  showLegend?: boolean
  interactive?: boolean
  onDataPointClick?: (data: any) => void
}