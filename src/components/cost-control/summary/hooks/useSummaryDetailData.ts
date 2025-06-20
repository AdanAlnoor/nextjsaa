'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

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
  isExpanded?: boolean
  children?: BudgetItem[]
  parent_id?: string
  structure_id?: string
  type: 'structure' | 'element'
}

interface SummaryTotals {
  original: number
  actual: number
  difference: number
  paidBills: number
  externalBills: number
  pendingBills: number
}

interface SummaryDetailDataResult {
  items: BudgetItem[]
  totals: SummaryTotals
  isLoading: boolean
  isError: boolean
  expandedItems: Set<string>
  toggleItemExpanded: (id: string) => void
  refreshData: (options?: { force?: boolean }) => Promise<void>
}

// Database data structures
interface Structure {
  id: string
  name: string
  amount: number
  order_index?: number
  project_id: string
  created_at?: string
  updated_at?: string
}

interface Element {
  id: string
  name: string
  amount: number
  order_index?: number
  structure_id: string | null
  project_id: string
  created_at?: string
  updated_at?: string
}

interface ProjectSummary {
  id: string
  project_id: string
  structure_count: number
  element_count: number
  estimate_total: number
  paid_bills_total: number
  unpaid_bills_total: number
  bills_difference: number
  purchase_orders_total: number
  wages_total: number
  last_updated_at: string
  created_at: string
}

export function useSummaryDetailData(projectId: string): SummaryDetailDataResult {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const [items, setItems] = useState<BudgetItem[]>([])
  
  // Fetch project summary data
  const { data: summaryData, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: async () => {
      console.log('Fetching project summary for', projectId)
      const supabase = createClient()
      
      try {
        const { data: summary, error } = await supabase
          .from('estimate_project_summary')
          .select('*')
          .eq('project_id', projectId)
          .single()
        
        if (error) {
          throw new Error(`Error fetching summary: ${error.message}`)
        }
        
        return summary as ProjectSummary
      } catch (error) {
        console.error('Failed to fetch project summary:', error)
        throw error
      }
    },
    enabled: !!projectId,
    retry: 1
  })
  
  // Fetch structures and elements separately to prevent duplication issues
  const { data: structuresAndElements, isLoading: isStructureLoading, error: structureError, refetch: refetchStructures } = useQuery({
    queryKey: ['summary-structures-and-elements', projectId],
    queryFn: async () => {
      console.log('Fetching structures and elements for', projectId)
      
      const supabase = createClient()
      
      try {
        // First, fetch all structures for this project
        const { data: structures, error: structuresError } = await supabase
          .from('estimate_structures')
          .select('id, name, amount, project_id')
          .eq('project_id', projectId)
          .order('name')
        
        if (structuresError) {
          throw new Error(`Error fetching structures: ${structuresError.message}`)
        }
        
        // Next, fetch ALL elements for this project
        const { data: allElements, error: elementsError } = await supabase
          .from('estimate_elements')
          .select('id, name, amount, structure_id, project_id')
          .eq('project_id', projectId)
          .order('name')
        
        if (elementsError) {
          throw new Error(`Error fetching elements: ${elementsError.message}`)
        }
        
        // Group elements by structure_id for easier processing
        const elementsByStructure: Record<string, Element[]> = {}
        const orphanedElements: Element[] = []
        
        allElements.forEach((element: Element) => {
          if (element.structure_id) {
            if (!elementsByStructure[element.structure_id]) {
              elementsByStructure[element.structure_id] = []
            }
            elementsByStructure[element.structure_id].push(element as Element)
          } else {
            orphanedElements.push(element as Element)
          }
        })
        
        return {
          structures: structures as Structure[],
          elementsByStructure,
          orphanedElements,
          allElements: allElements as Element[]
        }
      } catch (error) {
        console.error('Failed to fetch structures and elements:', error)
        throw error
      }
    },
    enabled: !!projectId,
    retry: 1
  })
  
  // Transform data to budget items with proper hierarchy
  const transformItemsData = useCallback(() => {
    if (!structuresAndElements) return
    
    console.log('Transforming structures and elements data:', structuresAndElements)
    
    const { structures, elementsByStructure, orphanedElements } = structuresAndElements
    const budgetItems: BudgetItem[] = []
    
    // Deduplicate structures by name to ensure no duplicates are displayed
    const structuresByName: Record<string, Structure> = {}
    structures.forEach(structure => {
      // If we haven't seen this structure name yet, or this one has more elements, use it
      const existingStructure = structuresByName[structure.name]
      const elementsCount = (elementsByStructure[structure.id] || []).length
      
      if (!existingStructure || elementsCount > (elementsByStructure[existingStructure.id] || []).length) {
        structuresByName[structure.name] = structure
      }
    })
    
    // Create budget items for structures and their elements using deduplicated structures
    Object.values(structuresByName).forEach(structure => {
      // Create structure item
      const structureItem: BudgetItem = {
        id: structure.id,
        name: structure.name,
        original: Number(structure.amount) || 0,
        actual: 0,
        difference: Number(structure.amount) || 0,
        paidBills: 0,
        externalBills: 0,
        pendingBills: 0,
        level: 0,
        isCompleted: false,
        hasChildren: !!(elementsByStructure[structure.id]?.length),
        children: [],
        type: 'structure'
      }
      
      // Create child items for elements with deduplication
      const elementsForStructure = elementsByStructure[structure.id] || []
      if (elementsForStructure.length > 0) {
        console.log(`Processing ${elementsForStructure.length} elements for structure ${structure.name}`)
        
        // Deduplicate elements by name
        const elementsByName: Record<string, Element> = {}
        elementsForStructure.forEach(element => {
          elementsByName[element.name] = element
        })
        
        structureItem.children = Object.values(elementsByName).map(element => ({
          id: element.id,
          name: element.name,
          original: Number(element.amount) || 0,
          actual: 0,
          difference: Number(element.amount) || 0,
          paidBills: 0,
          externalBills: 0,
          pendingBills: 0,
          level: 1,
          isCompleted: false,
          hasChildren: false,
          structure_id: structure.id,
          parent_id: structure.id,
          children: [],
          type: 'element'
        }))
        
        console.log(`Structure ${structure.name} has ${structureItem.children.length} unique elements`)
      }
      
      budgetItems.push(structureItem)
    })
    
    // Create a "virtual" structure for orphaned elements if any exist
    if (orphanedElements && orphanedElements.length > 0) {
      console.log(`Creating virtual structure for ${orphanedElements.length} orphaned elements`)
      
      // Deduplicate orphaned elements by name
      const orphanedElementsByName: Record<string, Element> = {}
      orphanedElements.forEach(element => {
        orphanedElementsByName[element.name] = element
      })
      
      const dedupedOrphanedElements = Object.values(orphanedElementsByName)
      
      const orphanedStructure: BudgetItem = {
        id: 'orphaned-structure',
        name: 'Unassigned Elements',
        original: dedupedOrphanedElements.reduce((sum: number, element: Element) => sum + (Number(element.amount) || 0), 0),
        actual: 0,
        difference: dedupedOrphanedElements.reduce((sum: number, element: Element) => sum + (Number(element.amount) || 0), 0),
        paidBills: 0,
        externalBills: 0,
        pendingBills: 0,
        level: 0,
        isCompleted: false,
        hasChildren: dedupedOrphanedElements.length > 0,
        children: dedupedOrphanedElements.map(element => ({
          id: element.id,
          name: element.name,
          original: Number(element.amount) || 0,
          actual: 0,
          difference: Number(element.amount) || 0,
          paidBills: 0,
          externalBills: 0,
          pendingBills: 0,
          level: 1,
          isCompleted: false,
          hasChildren: false,
          parent_id: 'orphaned-structure',
          children: [],
          type: 'element'
        })),
        type: 'structure'
      }
      
      budgetItems.push(orphanedStructure)
    }
    
    console.log('Final budget items after deduplication:', budgetItems)
    
    // Start with all items collapsed - users can expand as needed
    const expandedIds = new Set<string>()
    
    // Set the items and expanded state
    setItems(budgetItems)
    setExpandedItems(expandedIds)
    
  }, [structuresAndElements])
  
  useEffect(() => {
    transformItemsData()
  }, [transformItemsData])
  
  // Calculate totals from project summary
  const totals = useMemo((): SummaryTotals => {
    if (!summaryData) {
      return {
        original: 0,
        actual: 0,
        difference: 0,
        paidBills: 0,
        externalBills: 0,
        pendingBills: 0
      }
    }
    
    return {
      original: Number(summaryData.estimate_total) || 0,
      actual: (Number(summaryData.paid_bills_total) || 0) + (Number(summaryData.unpaid_bills_total) || 0),
      difference: Number(summaryData.bills_difference) || 0,
      paidBills: Number(summaryData.paid_bills_total) || 0,
      externalBills: 0, // Not tracked in summary table yet
      pendingBills: Number(summaryData.unpaid_bills_total) || 0
    }
  }, [summaryData])
  
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
  
  // Refresh data with optional force parameter
  const refreshData = async ({ force = false } = {}) => {
    if (force) {
      // Invalidate the queries first
      await queryClient.invalidateQueries({ queryKey: ['project-summary', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['summary-structures-and-elements', projectId] })
    }
    await refetchSummary()
    await refetchStructures()
  }
  
  // Flattened items for display
  const flattenedItems = useMemo((): BudgetItem[] => {
    if (!items.length) return []
    
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
    
    console.log(`Flattened ${result.length} items for display`)
    return result
  }, [items, expandedItems])
  
  const isLoading = isSummaryLoading || isStructureLoading
  const isError = !!summaryError || !!structureError
  
  return {
    items: flattenedItems,
    totals,
    isLoading,
    isError,
    expandedItems,
    toggleItemExpanded,
    refreshData
  }
} 