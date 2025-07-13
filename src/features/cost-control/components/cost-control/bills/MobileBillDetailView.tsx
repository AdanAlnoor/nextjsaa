import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ArrowLeft, ChevronDown, ChevronUp, Clipboard, DollarSign, Edit, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/utils';
import { StatusBadge } from './StatusBadge';
import { BillWithRelations, BillPayment, BillItem } from '@/services/billsService';
import { trackEvent, AnalyticsEventTypes } from '@/analytics/utils/analytics';

interface MobileBillDetailViewProps {
  bill: BillWithRelations;
  onClose: () => void;
  onEdit: (bill: BillWithRelations) => void;
  onDelete: (bill: BillWithRelations, e: React.MouseEvent) => void;
  onPayment: (bill: BillWithRelations) => void;
  onDuplicate?: (bill: BillWithRelations, e: React.MouseEvent) => void;
}

export function MobileBillDetailView({
  bill,
  onClose,
  onEdit,
  onDelete,
  onPayment,
  onDuplicate
}: MobileBillDetailViewProps) {
  const [showItems, setShowItems] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  // Calculate paid and due amounts
  const paidAmount = bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const dueAmount = bill.amount - paidAmount;
  const isFullyPaid = bill.status === 'Paid' || paidAmount >= bill.amount;

  const toggleItems = () => {
    const newState = !showItems;
    setShowItems(newState);
    trackEvent(AnalyticsEventTypes.INTERACTION, {
      action: newState ? 'expand_bill_items' : 'collapse_bill_items',
      bill_id: bill.id
    });
  };

  const togglePayments = () => {
    const newState = !showPayments;
    setShowPayments(newState);
    trackEvent(AnalyticsEventTypes.INTERACTION, {
      action: newState ? 'expand_payment_history' : 'collapse_payment_history',
      bill_id: bill.id
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{bill.name || `Bill ${bill.bill_number}`}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={bill.status} />
            
            {/* PO Badge for bills created from POs */}
            {bill.purchase_order && (
              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <FileText className="h-3 w-3 mr-1" />
                From PO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill Summary Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Bill #:</span>
              <p className="font-medium">{bill.bill_number}</p>
            </div>
            <div>
              <span className="text-gray-500">Supplier:</span>
              <p className="font-medium">{bill.supplier?.name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Issue Date:</span>
              <p>{new Date(bill.issue_date).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Due Date:</span>
              <p>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Amount:</span>
              <p className="font-bold">{formatCurrency(bill.amount)}</p>
            </div>
            <div>
              <span className="text-gray-500">Due Amount:</span>
              <p className={`font-bold ${dueAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(dueAmount > 0 ? dueAmount : 0)}
              </p>
            </div>
          </div>
          
          {/* Display PO information if the bill was created from a PO */}
          {bill.purchase_order && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="bg-purple-50 p-3 rounded-md border border-purple-100">
                <h4 className="text-xs font-medium text-purple-800 flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  Created from Purchase Order
                </h4>
                <p className="mt-1 font-medium">
                  {bill.purchase_order.po_number}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button 
              variant="outline" 
              className="text-xs"
              onClick={() => onEdit(bill)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              className="text-xs"
              onClick={(e) => onDuplicate && onDuplicate(bill, e)}
            >
              <Clipboard className="h-3 w-3 mr-1" />
              Duplicate
            </Button>
            {!isFullyPaid && (
              <Button 
                className="text-xs col-span-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => onPayment(bill)}
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Record Payment
              </Button>
            )}
            <Button 
              variant="destructive" 
              className="text-xs col-span-2"
              onClick={(e) => onDelete(bill, e)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Description and Notes */}
      {(bill.description || bill.notes) && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {bill.description && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="mt-1">{bill.description}</p>
              </div>
            )}
            {bill.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <p className="mt-1">{bill.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bill Items Accordion */}
      <Card>
        <CardHeader 
          className="px-4 py-3 cursor-pointer flex flex-row items-center justify-between"
          onClick={toggleItems}
        >
          <CardTitle className="text-base">Bill Items</CardTitle>
          {showItems ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </CardHeader>
        {showItems && (
          <CardContent className="p-0">
            <div className="divide-y">
              {bill.items && bill.items.length > 0 ? (
                <>
                  {bill.items.map((item: BillItem) => (
                    <div key={item.id} className={`p-4 ${item.cost_control_item_id ? "bg-blue-50/30" : ""}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.description}</h4>
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.unit} × {formatCurrency(item.unit_cost)}
                          </p>
                          {item.cost_control_item_id && (
                            <div className="mt-1 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                              </svg>
                              Cost Control Item
                            </div>
                          )}
                        </div>
                        <div className={`font-bold ${item.cost_control_item_id ? "text-blue-700" : ""}`}>
                          {formatCurrency(item.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-gray-50 flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">{formatCurrency(bill.amount)}</span>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-gray-500">No items found</div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Payment History Accordion */}
      <Card>
        <CardHeader 
          className="px-4 py-3 cursor-pointer flex flex-row items-center justify-between"
          onClick={togglePayments}
        >
          <CardTitle className="text-base">Payment History</CardTitle>
          {showPayments ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </CardHeader>
        {showPayments && (
          <CardContent className="p-0">
            <div className="divide-y">
              {bill.payments && bill.payments.length > 0 ? (
                <>
                  {bill.payments.map((payment: BillPayment) => (
                    <div key={payment.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{formatCurrency(payment.amount)}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.payment_date).toLocaleDateString()} · {payment.payment_method || 'N/A'}
                          </p>
                          {payment.reference && (
                            <p className="text-sm text-gray-500">Ref: {payment.reference}</p>
                          )}
                        </div>
                      </div>
                      {payment.note && (
                        <p className="text-sm mt-2">{payment.note}</p>
                      )}
                    </div>
                  ))}
                  <div className="p-4 bg-gray-50 flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span>Total Paid</span>
                      <span className="font-medium">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Amount Due</span>
                      <span className={`font-bold ${dueAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(dueAmount > 0 ? dueAmount : 0)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-gray-500">No payments recorded</div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
} 