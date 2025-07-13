import React, { memo, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/shared/components/ui/table';
import { 
  ChevronUp, 
  ChevronDown, 
  Edit, 
  Trash2, 
  DollarSign, 
  Copy, 
  RefreshCcw, 
  PlusCircle,
  ArrowUpDown,
  MoreVertical,
  FileText
} from 'lucide-react';
import { BillWithRelations } from '@/services/billsService';
import { useMobileDetection } from '@/shared/utils/responsive';
import { StatusBadge } from './StatusBadge';
import { trackEvent, AnalyticsEventTypes } from '@/analytics/utils/analytics';
import { formatCurrency } from '@/shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Badge } from '@/shared/components/ui/badge';

export interface BillsTableProps {
  bills: BillWithRelations[];
  loading: boolean;
  error: string | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  onView: (bill: BillWithRelations) => void;
  onEdit: (bill: BillWithRelations) => void;
  onDelete: (bill: BillWithRelations, e: React.MouseEvent) => void;
  onRecordPayment: (bill: BillWithRelations) => void;
  onDuplicate: (bill: BillWithRelations, e: React.MouseEvent) => void;
  onAddBill: () => void;
  onConvertPO: (poId: string) => void;
}

export const BillsTable = memo(function BillsTable({
  bills,
  loading,
  error,
  sortBy,
  sortDirection,
  onSortChange,
  onView,
  onEdit,
  onDelete,
  onRecordPayment,
  onDuplicate,
  onAddBill,
  onConvertPO
}: BillsTableProps) {
  const isMobile = useMobileDetection();
  
  // Handle sorting columns
  const handleSort = (column: string) => {
    trackEvent(AnalyticsEventTypes.INTERACTION, {
      action: 'sort_column',
      column,
      current_direction: sortBy === column ? sortDirection : 'none'
    });
    
    onSortChange(column);
  };
  
  // Render sorting indicator
  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
    }
    
    return sortDirection === 'asc' ? 
      <ChevronUp className="ml-1 h-4 w-4" /> : 
      <ChevronDown className="ml-1 h-4 w-4" />;
  };
  
  // Render PO Badge for bills created from purchase orders
  const renderPOBadge = (bill: BillWithRelations) => {
    if (bill.purchase_order) {
      return (
        <Badge 
          variant="outline" 
          className="ml-2 bg-purple-50 text-purple-700 border-purple-200 text-xs"
          title={`Converted from PO: ${bill.purchase_order.po_number}`}
        >
          <FileText className="h-3 w-3 mr-1" />
          From PO
        </Badge>
      );
    }
    return null;
  };
  
  // Add new helper function to render cost control badge
  const renderCostControlBadge = (bill: BillWithRelations) => {
    // Check if any bill items have cost control item associations
    const hasCostControlItems = bill.items?.some(item => item.cost_control_item_id);
    
    if (hasCostControlItems) {
      return (
        <Badge 
          variant="outline" 
          className="ml-2 bg-blue-50 text-blue-700 border-blue-200 text-xs"
          title="This bill has cost control items"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
          Cost Control
        </Badge>
      );
    }
    return null;
  };
  
  // Mobile view for bills table
  if (isMobile) {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-10 text-gray-500">
          <RefreshCcw className="h-5 w-5 animate-spin mr-2" />
          <p>Loading bills...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center py-10">
          <p className="text-red-500 mb-3">{error}</p>
          <Button variant="outline" onClick={() => onSortChange(sortBy)}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }
    
    if (bills.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-10 text-center border rounded-lg bg-gray-50">
          <p className="text-gray-500 mb-4">No bills found</p>
          <Button onClick={onAddBill}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add your first bill
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4" data-testid="bills-table">
        {bills.map(bill => {
          const isPaid = bill.status === 'Paid';
          const isPartial = bill.status === 'Partial';
          const paidAmount = bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
          const dueAmount = bill.amount - paidAmount;
          
          return (
            <div 
              key={bill.id}
              className="border rounded-lg p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                console.log('Mobile bill card clicked:', bill.id);
                e.stopPropagation();
                onView(bill);
              }}
              data-testid="bill-row"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center flex-wrap gap-1">
                    <h3 className="font-medium">{bill.bill_number}</h3>
                    {renderPOBadge(bill)}
                    {renderCostControlBadge(bill)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {bill.supplier?.name || 'No Supplier'}
                  </p>
                </div>
                <StatusBadge status={bill.status} />
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <div className="text-sm">
                  <span className="text-gray-500">Issue Date: </span>
                  {new Date(bill.issue_date).toLocaleDateString()}
                </div>
                <div className="font-medium">
                  {formatCurrency(bill.amount)}
                </div>
              </div>
              
              {isPartial && (
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="text-gray-500">Due:</span>
                  <span className="font-medium text-orange-600">
                    {formatCurrency(dueAmount)}
                  </span>
                </div>
              )}
              
              {/* Display related PO number if exists */}
              {bill.purchase_order && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <span>From PO: {bill.purchase_order.po_number}</span>
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  {bill.due_date ? `Due: ${new Date(bill.due_date).toLocaleDateString()}` : ''}
                </div>
                {/* Kebab menu for actions */}
                <div onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 focus:ring-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem 
                        className={isPaid ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"}
                        disabled={isPaid}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isPaid) onRecordPayment(bill);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Record Payment
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(bill, e);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={isPaid ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"}
                        disabled={isPaid}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isPaid) onEdit(bill);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 cursor-pointer hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(bill, e);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  // Desktop view table
  return (
    <div className="border rounded-lg overflow-hidden bg-white" data-testid="bills-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('bill_number')}
            >
              <div className="flex items-center">
                Bill Number
                {renderSortIndicator('bill_number')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('supplier_id')}
            >
              <div className="flex items-center">
                Supplier
                {renderSortIndicator('supplier_id')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('issue_date')}
            >
              <div className="flex items-center">
                Issue Date
                {renderSortIndicator('issue_date')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('due_date')}
            >
              <div className="flex items-center">
                Due Date
                {renderSortIndicator('due_date')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer text-right"
              onClick={() => handleSort('amount')}
            >
              <div className="flex items-center justify-end">
                Amount
                {renderSortIndicator('amount')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center">
                Status
                {renderSortIndicator('status')}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10">
                <div className="flex justify-center items-center text-gray-500">
                  <RefreshCcw className="h-5 w-5 animate-spin mr-2" />
                  <p>Loading bills...</p>
                </div>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10">
                <div className="flex flex-col items-center">
                  <p className="text-red-500 mb-3">{error}</p>
                  <Button variant="outline" onClick={() => onSortChange(sortBy)}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : bills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10">
                <div className="flex flex-col items-center">
                  <p className="text-gray-500 mb-4">No bills found</p>
                  <Button onClick={onAddBill}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add your first bill
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            bills.map(bill => {
              const isPaid = bill.status === 'Paid';
              
              return (
                <TableRow 
                  key={bill.id} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={(e) => {
                    console.log('Bill row clicked:', bill.id);
                    e.stopPropagation();
                    onView(bill);
                  }}
                  data-testid="bill-row"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center flex-wrap gap-1">
                      {bill.bill_number}
                      {renderPOBadge(bill)}
                      {renderCostControlBadge(bill)}
                    </div>
                  </TableCell>
                  <TableCell>{bill.supplier?.name || 'No Supplier'}</TableCell>
                  <TableCell>{new Date(bill.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(bill.amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={bill.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 focus:ring-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            className={isPaid ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"}
                            disabled={isPaid}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isPaid) onRecordPayment(bill);
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Record Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(bill, e);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className={isPaid ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"}
                            disabled={isPaid}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isPaid) onEdit(bill);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 cursor-pointer hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(bill, e);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}); 