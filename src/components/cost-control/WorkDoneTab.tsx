'use client'

import { Database } from '@/types/supabase'
import { useCostControl } from '@/context/CostControlContext'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Plus, FileText, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'

type Project = Database['public']['Tables']['projects']['Row']

interface WorkDoneTabProps {
  project: Project
}

export function WorkDoneTab({ project }: WorkDoneTabProps) {
  const {
    loading,
    refreshing,
    error,
    refreshData,
  } = useCostControl()
  
  // This is a placeholder for actual work done data
  // In a real implementation, you would fetch this from the database
  const [workItems, setWorkItems] = useState([
    {
      id: '1',
      name: 'Foundation Work',
      startDate: '2023-05-01',
      endDate: '2023-05-15',
      progress: 100,
      estimatedCost: 350000,
      actualCost: 320000,
      status: 'Completed'
    },
    {
      id: '2',
      name: 'Structural Framework',
      startDate: '2023-05-20',
      endDate: '2023-06-10',
      progress: 80,
      estimatedCost: 450000,
      actualCost: 380000,
      status: 'In Progress'
    },
    {
      id: '3',
      name: 'Roofing',
      startDate: '2023-06-15',
      endDate: '2023-06-30',
      progress: 30,
      estimatedCost: 280000,
      actualCost: 120000,
      status: 'In Progress'
    }
  ])
  
  const handleAddWorkItem = () => {
    toast.success('This functionality will be implemented soon!')
  }
  
  const handleExportToPDF = () => {
    toast.success('Exported to PDF')
  }
  
  const handleExportToExcel = () => {
    toast.success('Exported to Excel')
  }
  
  const handleUpdateProgress = (id: string, newProgress: number) => {
    setWorkItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { 
            ...item, 
            progress: newProgress,
            status: newProgress === 100 ? 'Completed' : 'In Progress'
          }
          return updatedItem
        }
        return item
      })
    )
    toast.success('Progress updated')
  }
  
  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading work done data...</span>
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground">
          Track work progress for {project.name}
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
          
          <Button onClick={handleAddWorkItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Work Item
          </Button>
        </div>
      </div>
      
      <div className="bg-background rounded-lg border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm overflow-hidden">
        <Table className="border-collapse">
          <TableHeader className="bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200/50 dark:border-indigo-800/30">
            <TableRow className="hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20">
              <TableHead className="py-3 font-medium text-foreground">Work Item</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Date Range</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Progress</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Estimated Cost</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Actual Cost</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Variance</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Status</TableHead>
              <TableHead className="text-center py-3 font-medium text-foreground w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <p className="mb-1">No work items found</p>
                    <p className="text-sm">Add a new work item to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              workItems.map((item) => {
                const variance = item.estimatedCost - item.actualCost
                return (
                  <TableRow key={item.id} className="hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20">
                    <TableCell className="py-3 font-medium">{item.name}</TableCell>
                    <TableCell className="py-3">
                      {item.startDate} to {item.endDate}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-2">
                        <Progress value={item.progress} className="h-2 w-24" />
                        <span className="text-xs font-medium">{item.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">{formatCurrency(item.estimatedCost)}</TableCell>
                    <TableCell className="text-right py-3">{formatCurrency(item.actualCost)}</TableCell>
                    <TableCell className={`text-right py-3 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(variance)}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Update
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.progress < 100 && (
                            <>
                              <DropdownMenuItem onClick={() => handleUpdateProgress(item.id, Math.min(100, item.progress + 10))}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Update Progress
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => toast.success(`View details for ${item.name}`)}>
                            <FileText className="mr-2 h-4 w-4 text-blue-600" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 