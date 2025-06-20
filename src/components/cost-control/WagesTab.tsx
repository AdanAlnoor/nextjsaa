'use client'

import { Database } from '@/types/supabase'
import { useCostControl } from '@/context/CostControlContext'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Plus, FileText, FileSpreadsheet, Calendar } from 'lucide-react'
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

type Project = Database['public']['Tables']['projects']['Row']

interface WagesTabProps {
  project: Project
}

export function WagesTab({ project }: WagesTabProps) {
  const {
    loading,
    refreshing,
    error,
    refreshData,
  } = useCostControl()
  
  // This is a placeholder for actual wages data
  // In a real implementation, you would fetch this from the database
  const [wages, setWages] = useState([
    {
      id: '1',
      employee: 'John Doe',
      position: 'Site Manager',
      period: 'May 2023',
      hours: 160,
      rate: 500,
      amount: 80000,
      status: 'Paid'
    },
    {
      id: '2',
      employee: 'Jane Smith',
      position: 'Engineer',
      period: 'May 2023',
      hours: 160,
      rate: 450,
      amount: 72000,
      status: 'Paid'
    },
    {
      id: '3',
      employee: 'Robert Johnson',
      position: 'Foreman',
      period: 'June 2023',
      hours: 168,
      rate: 400,
      amount: 67200,
      status: 'Pending'
    }
  ])
  
  const handleAddWage = () => {
    toast.success('This functionality will be implemented soon!')
  }
  
  const handleExportToPDF = () => {
    toast.success('Exported to PDF')
  }
  
  const handleExportToExcel = () => {
    toast.success('Exported to Excel')
  }
  
  const handlePayWage = (id: string) => {
    setWages(prevWages => 
      prevWages.map(wage => 
        wage.id === id ? { ...wage, status: 'Paid' } : wage
      )
    )
    toast.success('Wage marked as paid')
  }
  
  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading wages data...</span>
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
          Manage wages for {project.name}
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
          
          <Button onClick={handleAddWage}>
            <Plus className="h-4 w-4 mr-2" />
            Add Wage
          </Button>
        </div>
      </div>
      
      <div className="bg-background rounded-lg border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm overflow-hidden">
        <Table className="border-collapse">
          <TableHeader className="bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200/50 dark:border-indigo-800/30">
            <TableRow className="hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20">
              <TableHead className="py-3 font-medium text-foreground">Employee</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Position</TableHead>
              <TableHead className="py-3 font-medium text-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Period
                </div>
              </TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Hours</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Rate (KSh)</TableHead>
              <TableHead className="text-right py-3 font-medium text-foreground">Amount</TableHead>
              <TableHead className="py-3 font-medium text-foreground">Status</TableHead>
              <TableHead className="text-center py-3 font-medium text-foreground w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <p className="mb-1">No wages found</p>
                    <p className="text-sm">Add a new wage record to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              wages.map((wage) => (
                <TableRow key={wage.id} className="hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20">
                  <TableCell className="py-3 font-medium">{wage.employee}</TableCell>
                  <TableCell className="py-3">{wage.position}</TableCell>
                  <TableCell className="py-3">{wage.period}</TableCell>
                  <TableCell className="text-right py-3">{wage.hours}</TableCell>
                  <TableCell className="text-right py-3">{wage.rate}</TableCell>
                  <TableCell className="text-right py-3">{formatCurrency(wage.amount)}</TableCell>
                  <TableCell className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      wage.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {wage.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-3">
                    {wage.status === 'Pending' ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePayWage(wage.id)}
                      >
                        Pay
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toast.success(`View details for ${wage.employee}`)}
                      >
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 