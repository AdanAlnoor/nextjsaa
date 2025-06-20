'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useCostControl } from '@/context/CostControlContext'

interface BudgetItem {
  id: string
  name: string
  original: number
  actual: number
  difference: number
  paidBills: number
  externalBills: number
  pendingBills: number
  level: number
  isCompleted?: boolean
  hasChildren?: boolean
  isExpanded?: boolean
  children?: BudgetItem[]
  parent_id?: string
  type?: 'structure' | 'element'
}

interface SummaryDetailDataResult {
  items: BudgetItem[]
  flattenedItems: BudgetItem[]
  summaryData: any
  expandedItems: Set<string>
  onToggleExpand: (id: string) => void
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function useSummaryDetailData(projectId: string): SummaryDetailDataResult {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const [items, setItems] = useState<BudgetItem[]>([])
  
  // Use existing cost control data instead of creating duplicates
  const { costControlItems, loading: isCostControlLoading, refreshData: refreshCostControl } = useCostControl()
  
  // Fetch project summary data
  const { data: summaryData, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: async () => {
      const supabase = createClient()
      
      try {
        const { data: summary, error } = await supabase
          .from('estimate_project_summary')
          .select('*')
          .eq('project_id', projectId)
          .single()
        
        if (error) {
          throw new Error(`Error fetching project summary: ${error.message}`)
        }
        
        return summary
      } catch (error) {
        throw error
      }
    },
    enabled: !!projectId,
    retry: 1
  })
  
  // Transform cost control data to budget items with proper hierarchy
  const transformItemsData = useCallback(() => {
    if (!costControlItems || costControlItems.length === 0) return
    
    
    const budgetItems: BudgetItem[] = []
    
    // Get parent items (structures) from cost control data
    const parentItems = costControlItems.filter(item => item.isParent)
    
    // Process each parent structure
    parentItems.forEach(parent => {
      // Create structure budget item
      const structureItem: BudgetItem = {
        id: parent.id,
        name: parent.name,
        original: parent.boAmount,
        actual: parent.actual,
        difference: parent.difference,
        paidBills: parent.paidBills,
        externalBills: parent.externalBills,
        pendingBills: parent.pendingBills,
        level: 0,
        isCompleted: false,
        hasChildren: !!(parent.children && parent.children.length > 0),
        children: [],
        type: 'structure'
      }
      
      // Add children elements if they exist
      if (parent.children && parent.children.length > 0) {
        const childItems = parent.children.map(childId => {
          const child = costControlItems.find(item => item.id === childId)
          if (!child) return null
          
          return {
            id: child.id,
            name: child.name,
            original: child.boAmount,
            actual: child.actual,
            difference: child.difference,
            paidBills: child.paidBills,
            externalBills: child.externalBills,
            pendingBills: child.pendingBills,
            level: 1,
            isCompleted: false,
            hasChildren: false,
            children: [],
            parent_id: parent.id,
            type: 'element'
          }
        }).filter(Boolean) as BudgetItem[]
        
        structureItem.children = childItems
      }
      
      budgetItems.push(structureItem)
    })
    
    
    // Start with all items collapsed - users can expand as needed
    const expandedIds = new Set<string>()
    
    // Set the items and expanded state
    setItems(budgetItems)
    setExpandedItems(expandedIds)
    
  }, [costControlItems])

  // Call transform when cost control data changes
  useEffect(() => {
    transformItemsData()
  }, [transformItemsData])

  // Toggle expand/collapse for items
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Create flattened items for display (only shows items that should be visible)
  const flattenedItems = useMemo(() => {
    const result: BudgetItem[] = []
    
    // Helper function to recursively add items and their children if expanded
    const addItemAndChildren = (item: BudgetItem) => {
      // Add the current item
      result.push({
        ...item,
        isExpanded: expandedItems.has(item.id)
      })
      
      // If this item is expanded and has children, add its children
      if (expandedItems.has(item.id) && item.hasChildren && item.children?.length) {
        item.children.forEach(child => {
          addItemAndChildren(child)
        })
      }
    }
    
    // Process all top-level items
    items.forEach(item => {
      addItemAndChildren(item)
    })
    
    return result
  }, [items, expandedItems])
  
  const isLoading = isSummaryLoading || isCostControlLoading
  const isError = !!summaryError

  const refetch = useCallback(() => {
    refetchSummary()
    refreshCostControl()
  }, [refetchSummary, refreshCostControl])

  return {
    items,
    flattenedItems,
    summaryData,
    expandedItems,
    onToggleExpand: handleToggleExpand,
    isLoading,
    isError,
    refetch
  }
}