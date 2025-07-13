'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { CostControlData } from '@/shared/types/supabase'
import { fetchCostControlData, createCostControlItem, updateCostControlItem, deleteCostControlItem } from '@/lib/services/cost-control-service'
import { importEstimateDataToCostControl } from '@/lib/estimateImport'
import { eventBus, EVENT_TYPES } from '@/shared/utils/events'

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
      
      
      const data = await fetchCostControlData(projectId);
      
      // Set the data without using sample data as fallback
      setCostControlItems(data);
      setLastRefresh(new Date());
      
      setError(null);
    } catch (err) {
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
    
    // When a bill payment is recorded, refresh the cost control data
    const unsubscribeBillPayment = eventBus.on(EVENT_TYPES.BILL_PAYMENT_RECORDED, (data) => {
      // Wait a short delay to allow database operations to complete
      setTimeout(() => {
        refreshData();
      }, 1000);
    });
    
    // When a general refresh is needed
    const unsubscribeRefreshNeeded = eventBus.on(EVENT_TYPES.COST_CONTROL_REFRESH_NEEDED, () => {
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
      
      const result = await importEstimateDataToCostControl(projectId, recalculateParents);
      
      if (!result.success) {
        let errorMessage = 'Import failed';
        
        // Detailed error handling based on the error type
        if (result.error) {
          if (typeof result.error === 'object') {
            if (result.error.message) {
              errorMessage = result.error.message;
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
      let errorMessage = 'Unknown error occurred during import';
      if (err?.message) {
        errorMessage = err.message;
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