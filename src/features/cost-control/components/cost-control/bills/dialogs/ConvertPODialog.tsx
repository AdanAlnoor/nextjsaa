import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays } from 'date-fns';
import { generateBillNumber } from '@/services/billsService';
import { createClient } from '@/shared/lib/supabase/client';
import { toast } from '@/shared/components/ui/use-toast';

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
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { trackEvent, AnalyticsEventTypes } from '@/analytics/utils/analytics';

// PO Conversion schema for validation
const convertPoSchema = z.object({
  bill_number: z.string().min(1, 'Bill number is required'),
  issue_date: z.date({
    required_error: 'Issue date is required',
  }),
  due_date: z.date({
    required_error: 'Due date is required',
  }),
  bill_reference: z.string().optional(),
});

type ConvertPoFormValues = z.infer<typeof convertPoSchema>;

interface ConvertPODialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  projectId: string;
  onSubmit: (data: any, items: any[]) => Promise<any>;
  isSubmitting: boolean;
}

export function ConvertPODialog({
  isOpen,
  onOpenChange,
  poId,
  projectId,
  onSubmit,
  isSubmitting,
}: ConvertPODialogProps) {
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the purchase order data when the component mounts
  useEffect(() => {
    if (isOpen && poId) {
      const fetchPO = async () => {
        try {
          setIsLoading(true);
          
          const supabase = createClient();
          
          // Enhanced query to include supplier information
          const { data: poData, error: poError } = await supabase
            .from('purchase_orders')
            .select('*, supplier:supplier_id(id, name)')
            .eq('id', poId)
            .single();
            
          if (poError) throw poError;
          
          setPurchaseOrder(poData);
          console.log('Fetched PO details for conversion:', {
            id: poData.id,
            po_number: poData.po_number,
            supplier_id: poData.supplier_id,
            supplier_name: poData.supplier?.name,
            assigned_to: poData.assigned_to
          });
          
        } catch (error) {
          console.error('Error fetching purchase order:', error);
          toast({
            title: 'Error',
            description: 'Failed to load purchase order details. Please try again.',
            variant: 'destructive'
          });
          
          if (onOpenChange) onOpenChange(false);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchPO();
    } else {
      setPurchaseOrder(null);
    }
  }, [isOpen, poId, onOpenChange]);
  
  // Set up form with validation
  const form = useForm<ConvertPoFormValues>({
    resolver: zodResolver(convertPoSchema),
    defaultValues: {
      bill_number: '',
      issue_date: new Date(),
      due_date: addDays(new Date(), 30), // Default due date 30 days from now
      bill_reference: purchaseOrder?.po_number || '',
    },
  });
  
  // Generate bill number and reset form when dialog opens
  useEffect(() => {
    if (isOpen && purchaseOrder) {
      const generateNumber = async () => {
        try {
          const billNumber = await generateBillNumber(projectId);
          form.setValue('bill_number', billNumber);
        } catch (error) {
          console.error('Error generating bill number:', error);
          form.setValue('bill_number', `BILL-${Date.now().toString().substring(7)}`);
        }
      };
      
      generateNumber();
      
      form.reset({
        bill_number: form.getValues('bill_number'),
        issue_date: new Date(),
        due_date: addDays(new Date(), 30),
        bill_reference: purchaseOrder?.po_number || '',
      });
      
      // Track dialog open
      trackEvent(AnalyticsEventTypes.DIALOG_OPEN, {
        dialog: 'convert_po_to_bill',
        po_id: purchaseOrder.id,
        po_number: purchaseOrder.po_number,
      });
    }
  }, [isOpen, purchaseOrder, projectId, form]);
  
  // Submit handler
  const handleSubmit = async (values: ConvertPoFormValues) => {
    if (!purchaseOrder) return;
    
    trackEvent(AnalyticsEventTypes.CREATE, {
      entity: 'bill',
      source: 'po_conversion',
      po_id: purchaseOrder.id,
      po_number: purchaseOrder.po_number,
    });
    
    // Prepare bill data
    const billData = {
      bill_number: values.bill_number,
      issue_date: format(values.issue_date, 'yyyy-MM-dd'),
      due_date: format(values.due_date, 'yyyy-MM-dd'),
      bill_reference: values.bill_reference,
      name: `Bill for ${purchaseOrder.po_number}`,
      _purchaseOrderId: purchaseOrder.id,
    };
    
    try {
      await onSubmit(billData, []); // Items will be taken from PO
      onOpenChange(false);
    } catch (error) {
      trackEvent(AnalyticsEventTypes.ERROR, {
        context: 'convert_po_to_bill',
        po_id: purchaseOrder.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
  
  if (!purchaseOrder) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert PO to Bill</DialogTitle>
          <DialogDescription>
            Convert Purchase Order {purchaseOrder.po_number} to a new bill
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
          <div>
            <span className="text-gray-500">Purchase Order:</span>
            <p className="font-medium">{purchaseOrder.po_number}</p>
          </div>
          <div>
            <span className="text-gray-500">Supplier:</span>
            <p className="font-medium">{purchaseOrder.supplier?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Amount:</span>
            <p className="font-medium">${new Intl.NumberFormat().format(purchaseOrder.total || 0)}</p>
          </div>
          <div>
            <span className="text-gray-500">Items:</span>
            <p className="font-medium">{purchaseOrder.items?.length || 0} items</p>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 mt-4">
            {/* Bill number field */}
            <FormField
              control={form.control}
              name="bill_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter bill number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Bill reference field */}
            <FormField
              control={form.control}
              name="bill_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional reference number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Issue date field */}
            <FormField
              control={form.control}
              name="issue_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Issue Date *</FormLabel>
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Due date field */}
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date *</FormLabel>
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                    Converting...
                  </>
                ) : (
                  'Convert to Bill'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 