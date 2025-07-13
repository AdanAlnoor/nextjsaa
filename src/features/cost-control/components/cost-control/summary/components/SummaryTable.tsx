'use client'

import { useCallback, memo } from 'react'
import { SummaryHeader } from './SummaryHeader'
import { SummaryRow } from './SummaryRow'
import React from 'react'
import { Database } from 'lucide-react'
import { TableCell, TableRow } from '@/shared/components/ui/table'
import { useCostControl } from '@/cost-control/context/CostControlContext'
import { Button } from '@/shared/components/ui/button'

interface BudgetItem {
  id: string
  name: string
  original: number
  actual: number
  difference: number
  paidBills: number
  externalBills: number
  pendingBills: number
  isExpanded?: boolean
  children?: BudgetItem[]
  level: number
  isCompleted?: boolean
  hasChildren?: boolean
  isTitle?: boolean
  project_id?: string
}

interface SummaryTotals {
  original: number
  actual: number
  difference: number
  paidBills: number
  externalBills: number
  pendingBills: number
}

interface SummaryTableProps {
  items: BudgetItem[]
  expandedItems: Set<string>
  onToggleExpand: (id: string) => void
  totals?: SummaryTotals
}

export const SummaryTable = memo(function SummaryTable({ 
  items, 
  expandedItems, 
  onToggleExpand
}: SummaryTableProps) {
  const { importFromEstimate, refreshData } = useCostControl()

  const renderItems = useCallback((items: BudgetItem[], level = 0) => {
    return items.map((item) => {
      const isExpanded = expandedItems.has(item.id)
      
      // Render the current row
      const row = (
        <React.Fragment key={item.id}>
          <SummaryRow
            item={item}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            level={item.level || level}
          />
          
          {/* Recursively render children if expanded */}
          {isExpanded && item.hasChildren && item.children && item.children.length > 0 && (
            renderItems(item.children, (item.level || level) + 1)
          )}
        </React.Fragment>
      )
      
      return row
    })
  }, [expandedItems, onToggleExpand])

  // Count items by level for analytics
  const countItemsByLevel = useCallback(() => {
    const counts = { level0: 0, level1: 0 }
    items.forEach(item => {
      if (item.level === 0) counts.level0++
      if (item.level === 1) counts.level1++
    })
    return counts
  }, [items])

  const itemCounts = countItemsByLevel()

  return (
    <div className="rounded-lg border border-slate-200/50 overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <SummaryHeader />
          <tbody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-52 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-blue-50/80 rounded-full p-3">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No Budget Data Available</h3>
                    <p className="text-sm text-slate-600 max-w-md">
                      There are no budget items available for this project. Import data from your project estimate to get started.
                    </p>
                    <div className="bg-blue-50/50 border border-blue-200/50 p-4 rounded-lg text-left max-w-md mx-auto mt-2">
                      <h4 className="font-medium text-blue-700 mb-1 text-sm">What will be imported?</h4>
                      <ul className="list-disc list-inside text-xs text-blue-600 space-y-1">
                        <li>Level 0 items (Structures) from your project estimate</li>
                        <li>Level 1 items (Elements) from your project estimate</li>
                        <li>Proper parent-child relationships will be maintained</li>
                      </ul>
                    </div>
                    <Button 
                      onClick={async () => {
                        await importFromEstimate(true);
                        refreshData({ force: true });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="default"
                    >
                      <Database className="mr-2 h-4 w-4" />
                      Import from Estimate
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              renderItems(items)
            )}
          </tbody>
        </table>
      </div>
      {/* Analytics footer - minimalist design */}
      <div className="px-4 py-2 text-xs bg-slate-50/50 text-slate-600 border-t border-slate-200/50 flex items-center gap-4">
        <span>Items: <span className="font-medium text-slate-900">{items.length}</span></span>
        <span>Structures: <span className="font-medium text-slate-900">{itemCounts.level0}</span></span>
        <span>Elements: <span className="font-medium text-slate-900">{itemCounts.level1}</span></span>
        <span>Expanded: <span className="font-medium text-slate-900">{expandedItems.size}</span></span>
      </div>
    </div>
  );
}) 