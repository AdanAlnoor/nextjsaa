'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/utils/formatters'
import { ChevronRight, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export interface BudgetItem {
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

export interface SummaryRowProps {
  item: BudgetItem
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  hiddenColumns?: string[]
  isLoading?: boolean
}

export function SummaryRow({ item, isExpanded, onToggleExpand, hiddenColumns = [], isLoading = false }: SummaryRowProps) {
  const [animateExpand, setAnimateExpand] = useState(false)

  // Handle animation timing when expanding/collapsing
  useEffect(() => {
    if (isExpanded) {
      setAnimateExpand(true)
    } else {
      const timer = setTimeout(() => {
        setAnimateExpand(false)
      }, 300) // Match the CSS transition duration
      return () => clearTimeout(timer)
    }
  }, [isExpanded])

  const isColumnVisible = (column: string) => !hiddenColumns.includes(column)

  // Format percentage difference
  const getDifferencePercent = () => {
    if (item.original === 0) return 0
    return Math.round((item.difference / item.original) * 100)
  }

  const differencePercent = getDifferencePercent()
  
  // Determine text color for difference based on value
  const getDifferenceColor = () => {
    if (differencePercent === 0) return 'text-gray-600'
    return differencePercent > 0 ? 'text-green-600' : 'text-red-600'
  }

  // Handle row click to expand/collapse
  const handleRowClick = () => {
    if (item.hasChildren) {
      onToggleExpand(item.id)
    }
  }

  return (
    <tr 
      className={clsx(
        'border-b border-slate-200 transition-all duration-200',
        {
          'cursor-pointer hover:bg-slate-50': item.hasChildren,
          'bg-slate-100 font-medium': item.isTitle,
          'pl-4': item.level === 1 // Indent level 1 items
        }
      )}
      onClick={handleRowClick}
    >
      {/* Name column with expand/collapse icon */}
      <td className="p-2 whitespace-nowrap">
        <div className="flex items-center">
          {/* Indentation based on level */}
          <div style={{ width: `${item.level * 16}px` }}></div>
          
          {/* Expand/collapse icon for items with children */}
          {item.hasChildren ? (
            <button 
              className="mr-1 p-1 rounded hover:bg-slate-200"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(item.id)
              }}
            >
              {isExpanded ? 
                <ChevronDown className="h-4 w-4 text-slate-600" /> : 
                <ChevronRight className="h-4 w-4 text-slate-600" />
              }
            </button>
          ) : (
            <div className="w-6"></div> {/* Spacer for alignment */}
          )}
          
          <span className={clsx('', { 'font-medium': item.isTitle })}>
            {item.name}
          </span>
        </div>
      </td>
      
      {/* Original Budget */}
      {isColumnVisible('original') && (
        <td className="p-2 text-right whitespace-nowrap">
          {formatCurrency(item.original)}
        </td>
      )}
      
      {/* Actual Cost */}
      {isColumnVisible('actual') && (
        <td className="p-2 text-right whitespace-nowrap">
          {formatCurrency(item.actual)}
        </td>
      )}
      
      {/* Difference */}
      {isColumnVisible('difference') && (
        <td className="p-2 text-right whitespace-nowrap">
          <div className="flex flex-col items-end">
            <span className={getDifferenceColor()}>
              {formatCurrency(item.difference)}
            </span>
            <span className={clsx('text-xs', getDifferenceColor())}>
              {differencePercent}%
            </span>
          </div>
        </td>
      )}
      
      {/* Paid Bills */}
      {isColumnVisible('paidBills') && (
        <td className="p-2 text-right whitespace-nowrap">
          {formatCurrency(item.paidBills)}
        </td>
      )}
      
      {/* External Bills */}
      {isColumnVisible('externalBills') && (
        <td className="p-2 text-right whitespace-nowrap">
          {formatCurrency(item.externalBills)}
        </td>
      )}
      
      {/* Pending Bills */}
      {isColumnVisible('pendingBills') && (
        <td className="p-2 text-right whitespace-nowrap">
          {formatCurrency(item.pendingBills)}
        </td>
      )}
    </tr>
  )
}