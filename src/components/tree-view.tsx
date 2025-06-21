"use client"

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface TreeItem {
  id: number
  name: string
  type: 'file' | 'folder'
  icon: React.ElementType
  children?: TreeItem[]
}

interface TreeViewProps {
  items: TreeItem[]
  level?: number
  expanded?: boolean
  searchQuery?: string
}

export function TreeView({ items, level = 0, expanded = true, searchQuery = '' }: TreeViewProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    items.reduce((acc, item) => ({
      ...acc,
      [item.id]: expanded,
    }), {})
  )

  // Expand items that match search query
  useEffect(() => {
    if (searchQuery) {
      const shouldExpand = (item: TreeItem): boolean => {
        if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) return true
        if (item.children) {
          return item.children.some(child => shouldExpand(child))
        }
        return false
      }

      const newExpandedItems = { ...expandedItems }
      items.forEach(item => {
        if (shouldExpand(item)) {
          newExpandedItems[item.id] = true
        }
      })
      setExpandedItems(newExpandedItems)
    }
  }, [searchQuery, items])

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const highlightText = (text: string) => {
    if (!searchQuery) return text

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'))
    return (
      <>
        {parts.map((part, i) => (
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</span>
          ) : part
        ))}
      </>
    )
  }

  return (
    <div className={cn("space-y-1", level > 0 && "ml-6")}>
      {items.map((item) => {
        const matchesSearch = searchQuery && 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())

        return (
          <div key={item.id}>
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer",
                matchesSearch && "bg-muted/30"
              )}
              onClick={() => item.type === 'folder' && toggleExpand(item.id)}
            >
              {item.type === 'folder' && (
                expandedItems[item.id] ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )
              )}
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{highlightText(item.name)}</span>
            </div>
            
            {item.children && expandedItems[item.id] && (
              <TreeView
                items={item.children}
                level={level + 1}
                expanded={expanded}
                searchQuery={searchQuery}
              />
            )}
          </div>
        )
      })}
    </div>
  )
} 