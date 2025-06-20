'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { CostControlData } from '@/types/supabase'
import { fetchCostControlData, createCostControlItem, updateCostControlItem, deleteCostControlItem } from '@/lib/services/cost-control-service'
import { importEstimateDataToCostControl } from '@/lib/estimateImport'
import { eventBus, EVENT_TYPES } from '@/utils/events'

// Remove sample fallback data
interface CostControlContextType {
  costControlItems: CostControlData[]
  loading: boolean
  refreshing: boolean
  importing: boolean
  error: string | null
  visibleItems: CostControlData[]
  parentItems: { id: string; name: string }[]
  toggleItem: (id: string) => void
  refreshData: (options?: { force?: boolean, silent?: boolean }) => Promise<void>
  addCostControlItem: (projectId: string, item: any) => Promise<any>
  updateCostControlItem: (id: string, updates: any) => Promise<any>
  deleteCostControlItem: (id: string) => Promise<boolean>
  importFromEstimate: (recalculateParents?: boolean) => Promise<{ success: boolean, error?: string }>
}

const CostControlContext = createContext<CostControlContextType | undefined>(undefined)

export function CostControlProvider({ 
  children, 
  projectId 
}: { 
  children: ReactNode
  projectId: string
}) {
  const [costControlItems, setCostControlItems] = useState<CostControlData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Compute parent items for form dropdowns
  const parentItems = costControlItems
    .filter(item => item.isParent)
    .map(item => ({ id: item.id, name: item.name }))

  // Toggle the open/closed state of a parent item
  const toggleItem = (id: string) => {
    setCostControlItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, isOpen: !item.isOpen } : item
      )
    )
  }

  // Make refreshData memoized so it can be used in useEffect dependencies
  const refreshData = useCallback(async (options?: { force?: boolean, silent?: boolean }) => {
    try {
      const isForceRefresh = options?.force === true;
      const isSilentRefresh = options?.silent === true;
      
      if (!isSilentRefresh) {
        setRefreshing(true);
      }
      
      console.log(`CostControlContext: ${isForceRefresh ? 'Force refreshing' : 'Refreshing'} data for project`, projectId);
      
      const data = await fetchCostControlData(projectId);
      console.log(`CostControlContext: Fetched ${data.length} items from database`);
      
      if (data.length > 0) {
        console.log("CostControlContext: Sample item from fetched data:", data[0]);
        
        // Check for any items with zero paid bills that shouldn't be zero
        const zeroItems = data.filter(item => 
          !item.isParent && 
          (item.paidBills === 0 || item.paidBills === undefined)
        );
        console.log(`CostControlContext: Found ${zeroItems.length} items with zero paid bills`);
      }
      
      // Set the data without using sample data as fallback
      setCostControlItems(data);
      console.log("CostControlContext: Updated state with fetched data");
      setLastRefresh(new Date());
      
      setError(null);
    } catch (err) {
      console.error('CostControlContext: Failed to load cost control data:', err);
      if (!options?.silent) {
        setError('Failed to load cost control data');
      }
      setCostControlItems([]); // Set empty array instead of sample data
    } finally {
      if (!options?.silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [projectId]);

  // Listen for bill payment events
  useEffect(() => {
    console.log("CostControlContext: Setting up event listeners for project", projectId);
    
    // When a bill payment is recorded, refresh the cost control data
    const unsubscribeBillPayment = eventBus.on(EVENT_TYPES.BILL_PAYMENT_RECORDED, (data) => {
      console.log("CostControlContext: Bill payment recorded event received", data);
      // Wait a short delay to allow database operations to complete
      setTimeout(() => {
        console.log("CostControlContext: Refreshing after bill payment");
        refreshData();
      }, 1000);
    });
    
    // When a general refresh is needed
    const unsubscribeRefreshNeeded = eventBus.on(EVENT_TYPES.COST_CONTROL_REFRESH_NEEDED, () => {
      console.log("CostControlContext: Refresh needed event received");
      refreshData();
    });
    
    // Cleanup on unmount
    return () => {
      unsubscribeBillPayment();
      unsubscribeRefreshNeeded();
    };
  }, [projectId, refreshData]);

  // Initial load of data
  useEffect(() => {
    refreshData();
  }, [projectId, refreshData]);

  // Build a map of parent items to their visible children
  const visibleItems = useMemo(() => {
    const result: CostControlData[] = []
    const addedIds = new Set<string>()
    
    // First, add all parent items
    costControlItems.forEach(item => {
      if (item.isParent && !addedIds.has(item.id)) {
        result.push(item)
        addedIds.add(item.id)
        
        // If this parent is open, include its children
        if (item.isOpen && item.children) {
          item.children.forEach(childId => {
            const child = costControlItems.find(c => c.id === childId)
            if (child && !addedIds.has(child.id)) {
              result.push(child)
              addedIds.add(child.id)
            }
          })
        }
      }
    })
    
    // Log the visible items for debugging
    console.log('Visible items in CostControlContext:', result.length, result.map(i => i.name));
    
    // Check for any items with undefined or NaN values
    result.forEach(item => {
      if (item.boAmount === undefined || isNaN(item.boAmount)) {
        console.warn('Item with invalid boAmount:', item);
      }
      if (item.actual === undefined || isNaN(item.actual)) {
        console.warn('Item with invalid actual:', item);
      }
      if (item.paidBills === undefined || isNaN(item.paidBills)) {
        console.warn('Item with invalid paidBills:', item);
      }
      if (item.externalBills === undefined || isNaN(item.externalBills)) {
        console.warn('Item with invalid externalBills:', item);
      }
      if (item.pendingBills === undefined || isNaN(item.pendingBills)) {
        console.warn('Item with invalid pendingBills:', item);
      }
      if (item.wages === undefined || isNaN(item.wages)) {
        console.warn('Item with invalid wages:', item);
      }
    });
    
    return result
  }, [costControlItems])

  // Add new cost control item
  const addItem = async (projectId: string, item: any) => {
    const result = await createCostControlItem(projectId, item)
    if (result) {
      refreshData()
    }
    return result
  }

  // Update cost control item
  const updateItem = async (id: string, updates: any) => {
    const result = await updateCostControlItem(id, updates)
    if (result) {
      refreshData()
    }
    return result
  }

  // Delete cost control item
  const deleteItem = async (id: string) => {
    const result = await deleteCostControlItem(id)
    if (result) {
      refreshData()
    }
    return result
  }

  // Import from estimate
  const importFromEstimate = async (recalculateParents: boolean = false) => {
    try {
      setImporting(true);
      console.log('CostControlContext: Starting import for project ID:', projectId);
      console.log('CostControlContext: Recalculate parents option:', recalculateParents);
      
      const result = await importEstimateDataToCostControl(projectId, recalculateParents);
      console.log('CostControlContext: Import result:', result);
      
      if (!result.success) {
        let errorMessage = 'Import failed';
        
        // Detailed error handling based on the error type
        if (result.error) {
          console.error('CostControlContext: Import error details:', result.error);
          
          if (typeof result.error === 'object') {
            if (result.error.code) {
              console.error('CostControlContext: Error code:', result.error.code);
            }
            if (result.error.message) {
              errorMessage = result.error.message;
              console.error('CostControlContext: Error message:', result.error.message);
            }
            if (result.error.details) {
              console.error('CostControlContext: Error details:', result.error.details);
            }
          } else if (typeof result.error === 'string') {
            errorMessage = result.error;
          }
        }
        
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      // Refresh data after successful import
      await refreshData();
      return { success: true };
    } catch (err: any) {
      console.error('CostControlContext: Exception during import:', err);
      
      let errorMessage = 'Unknown error occurred during import';
      if (err) {
        if (err.message) {
          errorMessage = err.message;
          console.error('CostControlContext: Error message:', err.message);
        }
        if (err.code) {
          console.error('CostControlContext: Error code:', err.code);
        }
        if (err.details) {
          console.error('CostControlContext: Error details:', err.details);
        }
        if (err.hint) {
          console.error('CostControlContext: Error hint:', err.hint);
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setImporting(false);
    }
  };

  const value = {
    costControlItems,
    loading,
    refreshing,
    importing,
    error,
    visibleItems,
    parentItems,
    toggleItem,
    refreshData,
    addCostControlItem: addItem,
    updateCostControlItem: updateItem,
    deleteCostControlItem: deleteItem,
    importFromEstimate
  }

  return (
    <CostControlContext.Provider value={value}>
      {children}
    </CostControlContext.Provider>
  )
}

export function useCostControl() {
  const context = useContext(CostControlContext)
  if (context === undefined) {
    throw new Error('useCostControl must be used within a CostControlProvider')
  }
  return context
} 