'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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

interface SummaryRowProps {
  item: BudgetItem
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  level?: number
}

export function SummaryRow({ item, isExpanded, onToggleExpand }: SummaryRowProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    if (item.hasChildren) {
      onToggleExpand(item.id)
    }
  }

  const handleRowClick = () => {
    if (item.hasChildren) {
      onToggleExpand(item.id)
    }
  }

  // Adjust the indentation based on level
  const indentationStyle = {
    paddingLeft: `${item.level * 2 + 0.5}rem`
  }

  if (!isMounted) {
    return null // Prevent hydration errors
  }
  
  
  // Check if this is an orphaned level 1 item (level 1 but displayed at top level)
  const isOrphanedLevel1 = item.level === 1 && !indentationStyle.paddingLeft.startsWith('2.5')
  
  return (
    <motion.tr 
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        'border-t border-slate-200/40 transition-colors cursor-pointer',
        item.level === 0 ? 'bg-slate-50/30 hover:bg-slate-50/60' : 'hover:bg-slate-50/30',
        isOrphanedLevel1 ? 'bg-amber-50/30' : ''
      )}
      onClick={handleRowClick}
    >
      <td className="whitespace-nowrap relative pr-2 py-2.5">
        <div className="flex items-center" style={indentationStyle}>
          {item.hasChildren && (
            <button
              onClick={handleToggle}
              className="p-1 rounded mr-1 hover:bg-slate-200/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              data-testid={`toggle-${item.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
          )}
          {!item.hasChildren && item.level > 0 && (
            <span className="w-6"></span>
          )}
          <span className={cn(
            'text-sm',
            item.level === 0 ? 'font-medium text-slate-900' : 'text-slate-700',
          )}>
            {item.name}
          </span>
          {isOrphanedLevel1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="ml-2 flex items-center">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">This element doesn't have a matching parent structure</p>
              </TooltipContent>
            </Tooltip>
          )}
          {item.hasChildren && (
            <span className="ml-2 text-xs text-slate-500">
              ({item.children?.length || 0} items)
            </span>
          )}
        </div>
      </td>
      <td className="text-right tabular-nums px-4 py-2.5 text-sm text-slate-900">
        {formatCurrency(item.original)}
      </td>
      <td className="text-right tabular-nums px-4 py-2.5 text-sm text-slate-900">
        {formatCurrency(item.actual)}
      </td>
      <td 
        className={cn(
          "text-right tabular-nums px-4 py-2.5 text-sm font-medium",
          item.difference < 0 ? "text-red-600" : "text-blue-600"
        )}
      >
        {formatCurrency(item.difference)}
      </td>
      <td className="text-right tabular-nums px-4 py-2.5 text-sm text-slate-900">
        {formatCurrency(item.paidBills)}
      </td>
      <td className="text-right tabular-nums px-4 py-2.5 text-sm text-slate-900">
        {formatCurrency(item.externalBills)}
      </td>
      <td className="text-right tabular-nums px-4 py-2.5 text-sm text-slate-900">
        {formatCurrency(item.pendingBills)}
      </td>
    </motion.tr>
  )
} 