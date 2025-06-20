'use client'

import { Database } from '@/types/supabase'
import { useCostControl } from '@/context/CostControlContext'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Plus, FileText, FileSpreadsheet, Edit, Trash, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ImportFromEstimateButton } from './ImportFromEstimateButton'

type Project = Database['public']['Tables']['projects']['Row']

interface CostItemsTabProps {
  project: Project
}

export function CostItemsTab({ project }: CostItemsTabProps) {
  const {
    loading,
    refreshing,
    error,
    refreshData,
  } = useCostControl()
  
  // This is a placeholder for actual cost items data
  // In a real implementation, you would fetch this from the database
  const [costItems, setCostItems] = useState([
    {
      id: '1',
      name: 'Cement',
      category: 'Materials',
      unit: 'Bags',
      quantity: 500,
      unitPrice: 650,
      totalCost: 325000,
      supplier: 'ABC Suppliers'
    },
    {
      id: '2',
      name: 'Steel Bars',
      category: 'Materials',
      unit: 'Tons',
      quantity: 10,
      unitPrice: 85000,
      totalCost: 850000,
      supplier: 'XYZ Materials'
    },
    {
      id: '3',
      name: 'Excavator Rental',
      category: 'Equipment',
      unit: 'Days',
      quantity: 5,
      unitPrice: 15000,
      totalCost: 75000,
      supplier: 'Heavy Equipment Co.'
    }
  ])
  
  const handleAddCostItem = () => {
    toast.success('This functionality will be implemented soon!')
  }
  
  const handleExportToPDF = () => {
    toast.success('Exported to PDF')
  }
  
  const handleExportToExcel = () => {
    toast.success('Exported to Excel')
  }
  
  const handleEditCostItem = (id: string) => {
    toast.success(`Edit cost item ${id}`)
  }
  
  const handleDeleteCostItem = (id: string) => {
    setCostItems(prevItems => prevItems.filter(item => item.id !== id))
    toast.success('Cost item deleted')
  }
  
  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading cost items data...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
        <p className="mb-2">{error}</p>
        <div className="flex space-x-3 mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Try Again'}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      </div>
    )
  }
  
  // Calculate total cost
  const totalCost = costItems.reduce((sum, item) => sum + item.totalCost, 0)
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">
          Manage cost items for {project.name}
        </p>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
            className="shadow-sm border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin text-indigo-500' : 'text-indigo-500'}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <ImportFromEstimateButton 
            projectId={project.id}
            onSuccess={refreshData}
            className="shadow-sm border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shadow-sm border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                <FileText className="h-4 w-4 mr-2 text-green-600 dark:text-green-500" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportToPDF}>
                <FileText className="mr-2 h-4 w-4 text-red-600 dark:text-red-500" />
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportToExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600 dark:text-green-500" />
                Export to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={handleAddCostItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Item
          </Button>
        </div>
      </div>
      
      <div className="bg-background rounded-lg border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm overflow-hidden">
        <Table className="border-collapse">
          <TableHeader className="bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200/50 dark:border-indigo-800/30">
            <TableRow className="hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20">
              <TableHead className="py-3 font-medium text-foreground">Item Name</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Category</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Unit</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Quantity</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Unit Price</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Total Cost</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Supplier</TableHead>
              <TableHead className="text-center py-3 font-medium text-foreground w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <p className="mb-1">No cost items found</p>
                    <p className="text-sm">Add a new cost item to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {costItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20">
                    <TableCell className="py-3 font-medium">{item.name}</TableCell>
                    <TableCell className="py-3">{item.category}</TableCell>
                    <TableCell className="py-3">{item.unit}</TableCell>
                    <TableCell className="text-right py-3">{item.quantity}</TableCell>
                    <TableCell className="text-right py-3">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right py-3">{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell className="py-3">{item.supplier}</TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex justify-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600"
                          onClick={() => handleEditCostItem(item.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600"
                          onClick={() => handleDeleteCostItem(item.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-indigo-50/50 dark:bg-indigo-950/30 font-medium">
                  <TableCell colSpan={5} className="py-3 text-right">Total</TableCell>
                  <TableCell className="text-right py-3">{formatCurrency(totalCost)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 