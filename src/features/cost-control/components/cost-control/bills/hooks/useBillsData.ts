import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBills, BillWithRelations, BillFilters, getBillById } from '@/services/billsService';
import { trackEvent, trackError, AnalyticsEventTypes } from '@/analytics/utils/analytics';
import { createClient } from '@/shared/lib/supabase/client';

// Define pagination state
export interface PaginationState {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  setPage: (page: number) => void;
}

// Define the return type for useBillsData
export interface BillsDataReturn {
  bills: BillWithRelations[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  suppliers: any[];
  filterOptions: {
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    status?: string;
    supplier_id?: string;
    date_range?: { start: string; end: string };
    search?: string;
  };
  setFilterOptions: (options: any) => void;
  fetchBills: () => Promise<void>;
  fetchBillDetails: (id: string) => Promise<BillWithRelations>;
  refreshData: () => Promise<void>;
}

export function useBillsData(projectId: string): BillsDataReturn {
  // URL parameters
  const searchParams = useSearchParams();
  
  const [bills, setBills] = useState<BillWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter state
  const [filterOptions, setFilterOptions] = useState({
    sortBy: 'issue_date',
    sortDirection: 'desc' as 'asc' | 'desc',
    status: searchParams.get('status') || undefined,
    supplier_id: searchParams.get('supplier') || undefined,
    date_range: searchParams.get('from') && searchParams.get('to') ? {
      start: searchParams.get('from') as string,
      end: searchParams.get('to') as string
    } : undefined,
    search: searchParams.get('search') || undefined
  });
  
  // Fetch bills data
  const fetchBills = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filters: BillFilters = {};
      
      if (filterOptions.status) {
        filters.status = filterOptions.status;
      }
      
      if (filterOptions.supplier_id) {
        filters.supplier_id = filterOptions.supplier_id;
      }
      
      if (filterOptions.date_range) {
        filters.date_range = filterOptions.date_range;
      }
      
      if (filterOptions.search) {
        filters.search = filterOptions.search;
      }
      
      const { data, count } = await getBills({
        page,
        pageSize,
        filters,
        sortBy: filterOptions.sortBy,
        sortDirection: filterOptions.sortDirection,
        projectId
      });
      
      setBills(data);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      
      // Track analytics for filter usage
      if (Object.values(filters).some(v => v !== undefined)) {
        trackEvent(AnalyticsEventTypes.FILTER_APPLIED, {
          filters: JSON.stringify(filters),
          results_count: data.length
        });
      }
    } catch (err: any) {
      console.error('Error fetching bills:', err);
      setError(err.message || 'Failed to load bills');
      trackError(err, { context: 'fetch_bills', projectId });
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, filterOptions]);
  
  // Fetch bill details
  const fetchBillDetails = useCallback(async (id: string): Promise<BillWithRelations> => {
    try {
      return await getBillById(id);
    } catch (err) {
      console.error(`Error fetching bill details for ID ${id}:`, err);
      trackError(err, { context: 'fetch_bill_details', billId: id });
      throw err;
    }
  }, []);
  
  // Fetch suppliers for filters
  const fetchSuppliers = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const supabase = createClient();
      
      // Use direct table query instead of missing RPC function
      const { data, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('project_id', projectId);
      
      if (suppliersError) throw suppliersError;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      trackError(err, { context: 'fetch_suppliers', projectId });
    }
  }, [projectId]);
  
  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([fetchBills(), fetchSuppliers()]);
  }, [fetchBills, fetchSuppliers]);
  
  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  // Handle page change
  useEffect(() => {
    fetchBills();
  }, [page, pageSize, filterOptions, fetchBills]);
  
  return {
    bills,
    loading,
    error,
    pagination: {
      page,
      totalPages,
      pageSize,
      totalItems,
      setPage
    },
    suppliers,
    filterOptions,
    setFilterOptions,
    fetchBills,
    fetchBillDetails,
    refreshData
  };
} 