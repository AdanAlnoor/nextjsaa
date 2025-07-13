import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { BillWithRelations, BillPayment } from '@/services/billsService';
import { toast } from 'react-hot-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import { trackEvent, AnalyticsEventTypes } from '@/analytics/utils/analytics';

// Payment schema for validation
const createPaymentSchema = (dueAmount: number) => z.object({
  amount: z.coerce
    .number()
    .positive('Amount must be greater than zero')
    .refine(val => val <= dueAmount, {
      message: `Amount cannot exceed the remaining balance of $${dueAmount.toFixed(2)}`
    }),
  payment_date: z.date({
    required_error: 'Payment date is required',
  }),
  payment_method: z.string({
    required_error: 'Payment method is required',
  }).min(1, 'Payment method is required'),
  reference: z.string().optional(),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<ReturnType<typeof createPaymentSchema>>;

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithRelations | null;
  onSubmit: (data: any) => Promise<any>;
  isSubmitting: boolean;
}

// Create a temporary type for the optimistic bill update
type OptimisticBillUpdate = BillWithRelations & {
  paid_amount?: number;
  remaining_amount?: number;
};

export function RecordPaymentDialog({
  isOpen,
  onOpenChange,
  bill,
  onSubmit,
  isSubmitting,
}: RecordPaymentDialogProps) {
  // Calculate remaining due amount
  const paidAmount = bill?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const dueAmount = bill ? bill.amount - paidAmount : 0;
  
  // Set up form with validation
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(createPaymentSchema(dueAmount)),
    defaultValues: {
      amount: dueAmount > 0 ? dueAmount : 0,
      payment_date: new Date(),
      payment_method: '',
      reference: '',
      note: '',
    },
  });
  
  // Reset form when dialog opens or bill/dueAmount changes
  useEffect(() => {
    if (isOpen && bill) {
      form.reset({
        amount: dueAmount > 0 ? dueAmount : 0,
        payment_date: new Date(),
        payment_method: 'Bank Transfer', // Set a default payment method
        reference: '',
        note: '',
      });
      
      // Re-validate form with new dueAmount
      form.clearErrors();
      
      // Track dialog open
      trackEvent(AnalyticsEventTypes.DIALOG_OPEN, {
        dialog: 'record_payment',
        bill_id: bill.id,
        bill_number: bill.bill_number,
        due_amount: dueAmount,
      });
    }
  }, [isOpen, bill, dueAmount, form]);
  
  // Submit handler
  const handleSubmit = async (values: PaymentFormValues) => {
    if (!bill) return;
    
    try {
      // Track event
      trackEvent(AnalyticsEventTypes.PAYMENT, {
        bill_id: bill.id,
        bill_number: bill.bill_number,
        amount: values.amount,
        method: values.payment_method
      });
      
      // Format date as ISO string to avoid timezone issues
      // This preserves the user's selected date regardless of timezone
      const paymentDate = values.payment_date;
      const isoDate = paymentDate.toISOString().split('T')[0]; // Get YYYY-MM-DD only
      
      // Add bill ID to payment data
      const paymentData = {
        ...values,
        bill_id: bill.id,
        payment_date: isoDate, // Use ISO format string
      };
      
      // Apply optimistic UI update
      // Clone the bill and add a new payment to show immediately in UI
      const optimisticPayment: BillPayment = {
        id: `temp-${Date.now()}`, // Temporary ID until server responds
        bill_id: bill.id,
        amount: values.amount,
        payment_date: isoDate,
        payment_method: values.payment_method,
        reference: values.reference || '',
        note: values.note || '',
        status: 'Completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Calculate new paid amount and remaining amount for optimistic update
      const newPaidAmount = paidAmount + values.amount;
      const newStatus = newPaidAmount >= bill.amount ? 'Paid' : (newPaidAmount > 0 ? 'Partial' : 'Pending');
      
      // Close dialog before server response for better user experience
      onOpenChange(false);
      
      // Apply server update
      console.log("Submitting payment to server:", paymentData);
      const result = await onSubmit(paymentData);
      console.log("Payment submission successful:", result);
    } catch (error) {
      console.error("Error submitting payment:", error);
      
      // Show error alert
      toast.error(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Keep the dialog open so user can correct the issue
      return;
    }
  };
  
  if (!bill) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for bill {bill.bill_number}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Amount remaining summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Bill Total:</span>
                <span className="font-medium">
                  ${new Intl.NumberFormat().format(bill.amount)}
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Paid to Date:</span>
                <span className="font-medium text-green-600">
                  ${new Intl.NumberFormat().format(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="font-medium">Amount Due:</span>
                <span className="font-medium text-orange-600">
                  ${new Intl.NumberFormat().format(dueAmount)}
                </span>
              </div>
            </div>
            
            {/* Amount field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                      <Input
                        className="pl-7"
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Payment date field */}
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Payment method field */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                        <SelectValue placeholder="Select a payment method (required)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                      <SelectItem value="PayPal">PayPal</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Reference field */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference/Transaction ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional reference number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Note field */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional note about this payment"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Recording...
                  </>
                ) : (
                  'Record Payment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 