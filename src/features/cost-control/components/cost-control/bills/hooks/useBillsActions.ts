import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/shared/components/ui/use-toast';
import { 
  createBill as createBillService, 
  updateBill as updateBillService,
  deleteBill as deleteBillService,
  recordPayment as recordPaymentService,
  generateBillNumber as generateBillNumberService,
  createBillFromPurchaseOrder,
  duplicateBill as duplicateBillService,
  BillWithRelations
} from '@/services/billsService';
import { trackEvent, trackError, AnalyticsEventTypes } from '@/analytics/utils/analytics';

export interface BillsActionsReturn {
  isSubmitting: boolean;
  createBill: (billData: any, items: any[]) => Promise<BillWithRelations>;
  updateBill: (id: string, billData: any, items: any[], itemsToDelete?: string[]) => Promise<BillWithRelations>;
  deleteBill: (id: string) => Promise<void>;
  recordPayment: (payment: any) => Promise<boolean>;
  convertPOToBill: (poId: string, billData: any) => Promise<BillWithRelations>;
  generateBillNumber: () => Promise<string>;
  duplicateBill: (billId: string) => Promise<BillWithRelations>;
}

export function useBillsActions(projectId: string, onSuccess?: () => void): BillsActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Create a new bill
  const createBill = useCallback(async (billData: any, items: any[] = []): Promise<BillWithRelations> => {
    setIsSubmitting(true);
    try {
      // Add project ID to bill data
      const enhancedBillData = {
        ...billData,
        project_id: projectId
      };
      
      // Call service to create bill
      const result = await createBillService(enhancedBillData, items);
      
      toast({
        title: "Bill Created",
        description: `Bill ${result.bill_number} has been successfully created.`
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      return result;
    } catch (error) {
      console.error('Error creating bill:', error);
      toast({
        title: "Failed to Create Bill",
        description: "There was an error creating the bill. Please try again.",
        variant: "destructive"
      });
      trackError(error, { context: 'create_bill', projectId });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);
  
  // Update an existing bill
  const updateBill = useCallback(async (
    id: string, 
    billData: any, 
    items: any[] = [],
    itemsToDelete: string[] = []
  ): Promise<BillWithRelations> => {
    setIsSubmitting(true);
    try {
      trackEvent(AnalyticsEventTypes.UPDATE, {
        entity: 'bill',
        bill_id: id,
        items_count: items.length,
        items_deleted: itemsToDelete.length
      });
      
      // Call service to update bill
      const result = await updateBillService(id, billData, items, itemsToDelete);
      
      toast({
        title: "Bill Updated",
        description: `Bill ${result.bill_number} has been successfully updated.`
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      return result;
    } catch (error) {
      console.error('Error updating bill:', error);
      toast({
        title: "Failed to Update Bill",
        description: "There was an error updating the bill. Please try again.",
        variant: "destructive"
      });
      trackError(error, { context: 'update_bill', billId: id });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);
  
  // Delete a bill
  const deleteBill = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      trackEvent(AnalyticsEventTypes.DELETE, {
        entity: 'bill',
        bill_id: id
      });
      
      // Call service to delete bill
      await deleteBillService(id);
      
      toast({
        title: "Bill Deleted",
        description: "The bill has been successfully deleted."
      });
      
      // If this is a detail view, go back to the list
      router.replace(`/projects/${projectId}/cost-control/bills`);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: "Failed to Delete Bill",
        description: "There was an error deleting the bill. Please try again.",
        variant: "destructive"
      });
      trackError(error, { context: 'delete_bill', billId: id });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, router, onSuccess]);
  
  // Record a payment
  const recordPayment = useCallback(async (payment: any): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      trackEvent(AnalyticsEventTypes.PAYMENT, {
        bill_id: payment.bill_id,
        amount: payment.amount,
        method: payment.payment_method
      });
      
      // Call API to record payment
      const result = await recordPaymentService(payment);
      console.log("Payment recorded successfully:", result);
      
      // Show success toast
      toast({
        title: "Payment recorded successfully",
        description: `$${Number(payment.amount).toLocaleString()} payment has been recorded.`,
        variant: "success"
      });
      
      // Refetch bill data to update UI
      if (onSuccess) {
        console.log("Calling onSuccess callback to refresh data");
        onSuccess();
      }
      
      // Track analytics success event
      trackEvent(AnalyticsEventTypes.PAYMENT_RECORDED, {
        bill_id: payment.bill_id,
        amount: payment.amount
      });
      
      return true;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error recording payment:", error);
      
      // Show more specific error message based on error type
      toast({
        title: "Failed to record payment",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Track the error for analytics
      trackError(error, { context: 'record_payment', billId: payment.bill_id });
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);
  
  // Extract a user-friendly error message from an error object
  const extractErrorMessage = (error: any): string => {
    // Handle specific error messages we want to pass directly to the user
    if (error instanceof Error) {
      // PaymentExceedsBalanceError (custom pattern matching)
      if (error.message.includes('exceeds remaining balance')) {
        return error.message;
      }
      
      // Authentication errors
      if (error.message.includes('Authentication required')) {
        return 'Your session has expired. Please sign in again to record this payment.';
      }
      
      // Transaction errors
      if (error.message.includes('transaction')) {
        return 'Database transaction failed. The system is busy, please try again in a moment.';
      }
      
      // Connection errors
      if (error.message.includes('network') || error.message.includes('connection')) {
        return 'Network connection issue. Please check your internet connection and try again.';
      }
      
      // For other error messages that are already user-friendly, pass them through
      if (error.message && error.message.length < 100) {
        return error.message;
      }
    }
    
    // Default generic error message
    return 'An unexpected error occurred while recording your payment. Please try again or contact support if the problem persists.';
  };
  
  // Convert PO to bill
  const convertPOToBill = useCallback(async (poId: string, billData: any): Promise<BillWithRelations> => {
    setIsSubmitting(true);
    try {
      trackEvent(AnalyticsEventTypes.CREATE, {
        entity: 'bill',
        source: 'purchase_order',
        po_id: poId
      });
      
      // Call service to convert PO to bill
      const result = await createBillFromPurchaseOrder(poId, billData);
      
      toast({
        title: "PO Converted",
        description: `Purchase order has been converted to bill ${result.bill_number}.`
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      return result;
    } catch (error) {
      console.error('Error converting PO to bill:', error);
      toast({
        title: "Failed to Convert PO",
        description: "There was an error converting the purchase order to a bill. Please try again.",
        variant: "destructive"
      });
      trackError(error, { context: 'convert_po_to_bill', poId });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);
  
  // Generate a bill number
  const generateBillNumber = useCallback(async (): Promise<string> => {
    try {
      return await generateBillNumberService(projectId);
    } catch (error) {
      console.error('Error generating bill number:', error);
      trackError(error, { context: 'generate_bill_number', projectId });
      // Return a fallback generated number
      return `BILL-${Date.now().toString().substring(7)}`;
    }
  }, [projectId]);
  
  // Duplicate a bill
  const duplicateBill = useCallback(async (billId: string): Promise<BillWithRelations> => {
    setIsSubmitting(true);
    try {
      trackEvent(AnalyticsEventTypes.CREATE, {
        entity: 'bill',
        source: 'duplicate',
        original_bill_id: billId
      });
      
      // Call service to duplicate bill
      const result = await duplicateBillService(billId);
      
      toast({
        title: "Bill Duplicated",
        description: `Bill has been duplicated as ${result.bill_number}.`
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      return result;
    } catch (error) {
      console.error('Error duplicating bill:', error);
      toast({
        title: "Failed to Duplicate Bill",
        description: "There was an error duplicating the bill. Please try again.",
        variant: "destructive"
      });
      trackError(error, { context: 'duplicate_bill', billId });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);
  
  return {
    isSubmitting,
    createBill,
    updateBill,
    deleteBill,
    recordPayment,
    convertPOToBill,
    generateBillNumber,
    duplicateBill
  };
} 