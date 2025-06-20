import React, { useEffect } from 'react';
import { BillWithRelations } from '@/services/billsService';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { trackEvent, AnalyticsEventTypes } from '@/utils/analytics';

interface DeleteBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithRelations | null;
  onConfirm: () => Promise<any>;
  isSubmitting: boolean;
}

export function DeleteBillDialog({
  isOpen,
  onOpenChange,
  bill,
  onConfirm,
  isSubmitting,
}: DeleteBillDialogProps) {
  // Track dialog open
  useEffect(() => {
    if (isOpen && bill) {
      trackEvent(AnalyticsEventTypes.DIALOG_OPEN, {
        dialog: 'delete_bill',
        bill_id: bill.id,
        bill_number: bill.bill_number,
        status: bill.status,
      });
    }
  }, [isOpen, bill]);
  
  // Handle confirm
  const handleConfirm = async () => {
    if (!bill) return;
    
    trackEvent(AnalyticsEventTypes.DELETE, {
      entity: 'bill',
      bill_id: bill.id,
      bill_number: bill.bill_number,
      status: bill.status,
    });
    
    await onConfirm();
  };
  
  if (!bill) return null;
  
  // Calculate paid amount
  const paidAmount = bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const hasPaidAmount = paidAmount > 0;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Bill</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this bill? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Bill Number:</span>
              <p className="font-medium">{bill.bill_number}</p>
            </div>
            <div>
              <span className="text-gray-500">Amount:</span>
              <p className="font-medium">${new Intl.NumberFormat().format(bill.amount)}</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <p className="font-medium">{bill.status}</p>
            </div>
            <div>
              <span className="text-gray-500">Supplier:</span>
              <p className="font-medium">{bill.supplier?.name || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {hasPaidAmount && (
          <div className="mt-3 text-sm p-3 bg-orange-50 border border-orange-100 rounded-md text-orange-700">
            <strong>Warning:</strong> This bill has recorded payments. Deleting it will remove all payment records.
          </div>
        )}
        
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete Bill'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 