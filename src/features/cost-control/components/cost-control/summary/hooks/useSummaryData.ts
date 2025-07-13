'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'

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
  isTitle?: boolean
  children?: BudgetItem[]
}

interface SummaryTotals {
  original: number
  actual: number
  difference: number
  paidBills: number
  externalBills: number
  pendingBills: number
}

interface SummaryDataResult {
  items: BudgetItem[]
  totals: SummaryTotals
  isLoading: boolean
  isError: boolean
  expandedItems: Set<string>
  toggleItemExpanded: (id: string) => void
  refreshData: () => Promise<void>
}

// Backend data structure
interface CostControlItem {
  id: string
  parent_id: string | null
  name: string
  bo_amount: number
  actual_amount: number
  paid_bills: number
  external_bills: number
  pending_bills: number
  wages: number
  is_parent: boolean
  is_completed?: boolean
  is_deleted?: boolean
  estimate_item_id?: string
  level?: number
  formattedIndex?: string
  order_index?: number
  project_id: string
}

export function useSummaryData(projectId: string): SummaryDataResult {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const [items, setItems] = useState<BudgetItem[]>([])
  
  // Fetch cost control items
  const { 
    data: costControlItems, 
    isLoading: queryLoading, 
    isError: queryError,
    refetch
  } = useQuery({
    queryKey: ['costControlItems', projectId],
    queryFn: async () => {
      const supabase = createClient()
      
      try {
        console.log('Fetching cost control items for project:', projectId)
        
        // Get only level 0 and level 1 items using a more efficient query
        const { data: levelFilteredItems, error: levelFilteredError } = await supabase
          .from('cost_control_items')
          .select('*')
          .eq('project_id', projectId)
          .or('parent_id.is.null,parent_id.not.is.null')
          .order('order_index', { ascending: true })
        
        if (levelFilteredError) {
          console.error('Error fetching level 0 and 1 cost control items:', levelFilteredError)
          throw levelFilteredError
        }
        
        // Debug: Log fetched items
        console.log('Fetched level 0 and 1 items from database:', levelFilteredItems)
        
        // Then, filter out deleted items for display
        const displayItems = levelFilteredItems.filter(item => !item.is_deleted)
        
        // Debug: Check if we have Level 1 items (items with parent_id)
        const level1Items = displayItems.filter(item => item.parent_id !== null)
        console.log('Level 1 items (with parent_id):', level1Items)
        
        // Find the Main House item
        const mainHouseItem = displayItems.find(item => item.name.includes('Main House'))
        if (mainHouseItem) {
          console.log('Found Main House item:', mainHouseItem)
          console.log('Main House ID:', mainHouseItem.id)
          
          // Check if any Level 1 items have this as parent
          const mainHouseChildren = level1Items.filter(item => item.parent_id === mainHouseItem.id)
          console.log('Children of Main House:', mainHouseChildren)
          
          // Log all unique parent_ids to check what parents exist
          const uniqueParentIds = [...new Set(level1Items.map(item => item.parent_id))]
          console.log('Unique parent IDs in Level 1 items:', uniqueParentIds)
          
          // Find parents that actually exist in our items
          const existingParents = displayItems.filter(item => 
            uniqueParentIds.includes(item.id) && !item.parent_id
          )
          console.log('Existing parents for Level 1 items:', existingParents)
        }
        
        // Set levels based on parent-child relationships
        displayItems.forEach(item => {
          if (!item.parent_id) {
            item.level = 0 // Top-level items (Level 0)
          } else {
            item.level = 1 // Child items (Level 1)
          }
        })
        
        console.log('Fetched and processed cost control items:', displayItems)
        return displayItems as CostControlItem[]
      } catch (err) {
        console.error('Failed to fetch cost control items:', err)
        throw err
      }
    }
  })
  
  // Transform data to budget items with proper hierarchy
  const transformItemsData = useCallback(() => {
    if (!costControlItems) return
    
    console.log('Transforming cost control data:', costControlItems)
    
    // Ensure we only have level 0 and level 1 items
    const filteredItems = costControlItems.filter(item => item.level === 0 || item.level === 1)
    
    // Group items by level
    const level0Items = filteredItems.filter(item => item.level === 0)
    const level1Items = filteredItems.filter(item => item.level === 1)
    
    console.log(`Found ${level0Items.length} level 0 items and ${level1Items.length} level 1 items`)
    
    // Create all budget items
    const itemsMap = new Map<string, BudgetItem>()
    
    // Step 1: Create all level 0 items and store in map
    level0Items.forEach(item => {
      const budgetItem: BudgetItem = {
        id: item.id,
        name: item.name,
        original: item.bo_amount || 0,
        actual: item.actual_amount || 0,
        difference: (item.bo_amount || 0) - (item.actual_amount || 0),
        paidBills: item.paid_bills || 0,
        externalBills: item.external_bills || 0,
        pendingBills: item.pending_bills || 0,
        level: 0,
        isCompleted: item.is_completed,
        hasChildren: false,
        children: []
      }
      
      itemsMap.set(item.id, budgetItem)
    })
    
    // Step 2: Process level 1 items - attach to parents or make them top-level if parent not found
    const orphanedItems: BudgetItem[] = []
    
    level1Items.forEach(item => {
      const budgetItem: BudgetItem = {
        id: item.id,
        name: item.name,
        original: item.bo_amount || 0,
        actual: item.actual_amount || 0,
        difference: (item.bo_amount || 0) - (item.actual_amount || 0),
        paidBills: item.paid_bills || 0,
        externalBills: item.external_bills || 0,
        pendingBills: item.pending_bills || 0,
        level: 1,
        isCompleted: item.is_completed,
        hasChildren: false,
        children: []
      }
      
      if (!item.parent_id) {
        console.warn(`Level 1 item ${item.name} has no parent_id, making it a top-level item`)
        orphanedItems.push(budgetItem)
        return
      }
      
      const parentItem = itemsMap.get(item.parent_id)
      if (!parentItem) {
        console.warn(`Parent item for ${item.name} (parent_id: ${item.parent_id}) not found, making it a top-level item`)
        orphanedItems.push(budgetItem)
        return
      }
      
      // Add child to parent
      if (!parentItem.children) {
        parentItem.children = []
      }
      
      parentItem.children.push(budgetItem)
      parentItem.hasChildren = true
    })
    
    // Log the orphaned items for debugging
    if (orphanedItems.length > 0) {
      console.log(`Found ${orphanedItems.length} orphaned level 1 items that are now top-level`)
    }
    
    // Step 3: Create top-level items array from level 0 items and orphaned level 1 items
    const topLevelItems = [...Array.from(itemsMap.values()), ...orphanedItems]
    
    console.log('Final top-level items with children:', topLevelItems)
    
    // Auto-expand all level 0 items
    const expandedIds = new Set<string>()
    topLevelItems.forEach(item => {
      if (item.hasChildren) {
        expandedIds.add(item.id)
      }
    })
    
    // Set the items and expanded state
    setItems(topLevelItems)
    setExpandedItems(expandedIds)
    
  }, [costControlItems])
  
  useEffect(() => {
    transformItemsData()
  }, [transformItemsData])
  
  // Calculate totals from all level 0 items
  const totals = useMemo((): SummaryTotals => {
    if (!items.length) {
      return {
        original: 0,
        actual: 0,
        difference: 0,
        paidBills: 0,
        externalBills: 0,
        pendingBills: 0
      }
    }
    
    // Calculate totals directly from the top-level items
    return {
      original: items.reduce((sum, item) => sum + item.original, 0),
      actual: items.reduce((sum, item) => sum + item.actual, 0),
      difference: items.reduce((sum, item) => sum + item.difference, 0),
      paidBills: items.reduce((sum, item) => sum + item.paidBills, 0),
      externalBills: items.reduce((sum, item) => sum + item.externalBills, 0),
      pendingBills: items.reduce((sum, item) => sum + item.pendingBills, 0)
    }
  }, [items])
  
  // Toggle expanded state of an item
  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prevExpanded => {
      const newExpanded = new Set(prevExpanded)
      if (newExpanded.has(id)) {
        newExpanded.delete(id)
        console.log(`Collapsing item with ID: ${id}`)
      } else {
        newExpanded.add(id)
        console.log(`Expanding item with ID: ${id}`)
      }
      return newExpanded
    })
  }
  
  // Refresh data
  const refreshData = async () => {
    await refetch()
  }
  
  // Flatten the items hierarchy for display based on expanded state
  const flattenedItems = useMemo((): BudgetItem[] => {
    if (!items.length) return []
    
    const result: BudgetItem[] = []
    
    // Helper function to recursively add items and their children if expanded
    const addItemAndChildren = (item: BudgetItem, currentLevel: number) => {
      // Add the current item
      result.push({
        ...item,
        level: currentLevel // Ensure level is set correctly
      })
      
      // If this item is expanded and has children, add its children
      if (expandedItems.has(item.id) && item.hasChildren && item.children?.length) {
        console.log(`Adding ${item.children.length} children of expanded item "${item.name}"`)
        item.children.forEach(child => {
          // Add children with increased level
          addItemAndChildren(child, currentLevel + 1)
        })
      }
    }
    
    // Process all top-level items
    items.forEach(item => {
      addItemAndChildren(item, 0)
    })
    
    console.log('Flattened items for display:', result)
    return result
  }, [items, expandedItems])
  
  return {
    items: flattenedItems,
    totals,
    isLoading: queryLoading,
    isError: queryError,
    expandedItems,
    toggleItemExpanded,
    refreshData
  }
} 