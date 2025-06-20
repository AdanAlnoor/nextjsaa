import React, { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  DollarSign, 
  Copy, 
  Edit, 
  Trash2, 
  ExternalLink,
  FileText 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { BillWithRelations } from '@/services/billsService';
import { trackEvent, AnalyticsEventTypes } from '@/utils/analytics';
import { useMobileDetection } from '@/utils/responsive';
import { MobileBillDetailView } from './MobileBillDetailView';
import Link from 'next/link';

interface BillDetailViewProps {
  bill: BillWithRelations;
  projectId: string;
  onClose: () => void;
  onEdit: (bill: BillWithRelations) => void;
  onDelete: (bill: BillWithRelations, e: React.MouseEvent) => void;
  onRecordPayment: (bill: BillWithRelations) => void;
  onDuplicate: (bill: BillWithRelations, e: React.MouseEvent) => void;
  onSendToApproval: (bill: BillWithRelations) => void;
  authStatus: { isAuthenticated: boolean };
}

export const BillDetailView = memo(function BillDetailView({
  bill,
  projectId,
  onClose,
  onEdit,
  onDelete,
  onRecordPayment,
  onDuplicate,
  onSendToApproval,
  authStatus
}: BillDetailViewProps) {
  const [isPaidAmountExpanded, setIsPaidAmountExpanded] = useState(false);
  const isMobile = useMobileDetection();
  
  // Calculate payment related values
  const paidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const dueAmount = bill.amount - paidAmount;
  const isFullyPaid = bill.status === 'Paid';
  
  const isSubmittable = bill.status === 'Draft' && authStatus?.isAuthenticated;
  const canRecordPayment = ['Pending', 'Partial'].includes(bill.status) && authStatus?.isAuthenticated;
  
  // If on mobile, use the mobile-optimized view
  if (isMobile) {
    return (
      <MobileBillDetailView
        bill={bill}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onPayment={onRecordPayment}
        onDuplicate={onDuplicate}
      />
    );
  }
  
  const trackViewAction = (action: string) => {
    trackEvent(AnalyticsEventTypes.INTERACTION, {
      action,
      bill_id: bill.id,
      bill_number: bill.bill_number,
      bill_status: bill.status
    });
  };
  
  // Desktop view
  return (
    <div className="space-y-6" data-testid="bill-detail-view">
      {/* Header with bill name and status */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold truncate">
            {bill.name || `Bill ${bill.bill_number}`}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={bill.status} />
            
            {/* PO Badge - show prominently when bill is from a PO */}
            {bill.purchase_order && (
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <FileText className="h-3 w-3 mr-1" />
                From PO
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3 md:mt-0">
          <Button
            variant="outline"
            className="text-xs md:text-sm"
            onClick={(e) => {
              trackViewAction('duplicate_bill');
              onDuplicate(bill, e);
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>

          {canRecordPayment && (
            <Button 
              className="bg-green-600 hover:bg-green-700 text-xs md:text-sm"
              onClick={() => {
                trackViewAction('record_payment');
                onRecordPayment(bill);
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-2 space-y-6">
          {/* General info card */}
          <Card>
            <CardHeader className="px-6 py-4 bg-gray-50">
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 p-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Bill Number</h4>
                <p className="mt-1 font-medium">{bill.bill_number}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Supplier</h4>
                <p className="mt-1 font-medium">{bill.supplier?.name || 'N/A'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Issue Date</h4>
                <p className="mt-1">{new Date(bill.issue_date).toLocaleDateString()}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Due Date</h4>
                <p className="mt-1">{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              {bill.purchase_order && (
                <div className="col-span-2 bg-purple-50 p-3 rounded-md border border-purple-100">
                  <h4 className="text-sm font-medium text-purple-800 flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    Created from Purchase Order
                  </h4>
                  <p className="mt-1">
                    <Link 
                      href={`/projects/${projectId}/cost-control/purchase-orders?view=${bill.purchase_order.id}`}
                      passHref
                      className="text-blue-600 hover:text-blue-800 flex items-center group"
                    >
                      <span className="font-medium">{bill.purchase_order.po_number}</span>
                      <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Reference</h4>
                <p className="mt-1">{bill.bill_reference || 'N/A'}</p>
              </div>
              
              {bill.description && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="mt-1">{bill.description}</p>
                </div>
              )}
              
              {bill.notes && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                  <p className="mt-1">{bill.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Bill items card */}
          <Card>
            <CardHeader className="px-6 py-4 bg-gray-50">
              <CardTitle>Bill Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bill.items && bill.items.length > 0 ? (
                      bill.items.map((item) => (
                        <tr key={item.id} className={item.cost_control_item_id ? "bg-blue-50/30" : ""}>
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex flex-col">
                              <span>{item.description}</span>
                              {item.cost_control_item_id && (
                                <div className="mt-1 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 w-fit">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                  </svg>
                                  Cost Control Item
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {item.unit || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {formatCurrency(item.unit_cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                            <div className={item.cost_control_item_id ? "text-blue-700" : ""}>
                              {formatCurrency(item.amount)}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                    
                    {/* Total row */}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold">
                        Total
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold">
                        {formatCurrency(bill.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* Payment summary card */}
          <Card>
            <CardHeader className="px-6 py-4 bg-gray-50">
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium">{formatCurrency(bill.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-bold">Amount Due</span>
                <span className={`font-bold ${dueAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(dueAmount > 0 ? dueAmount : 0)}
                </span>
              </div>
              
              {!isFullyPaid && (
                <Button 
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    trackViewAction('record_payment_from_summary');
                    onRecordPayment(bill);
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Payment history card */}
          <Card>
            <CardHeader className="px-6 py-4 bg-gray-50">
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {bill.payments && bill.payments.length > 0 ? (
                  bill.payments.map((payment) => (
                    <div key={payment.id} className="p-6">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        <span className="text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Method: {payment.payment_method || 'N/A'}
                        {payment.reference && ` • Ref: ${payment.reference}`}
                      </div>
                      {payment.note && (
                        <div className="mt-2 text-sm">{payment.note}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No payments recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}); 