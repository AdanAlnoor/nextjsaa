import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { BillWithRelations } from '@/services/billsService';
import { createClient } from '@/utils/supabase/client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { trackEvent, trackError, AnalyticsEventTypes } from '@/utils/analytics';

// Bill edit form schema
const billItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit: z.string().optional(),
  unit_cost: z.coerce.number().min(0, 'Unit cost must be a positive number'),
  cost_control_item_id: z.string().optional(),
  _isNew: z.boolean().optional(), // Flag to track new items
});

const billSchema = z.object({
  bill_number: z.string().min(1, 'Bill number is required'),
  supplier_id: z.string().min(1, 'Supplier is required'),
  issue_date: z.date({
    required_error: 'Issue date is required',
  }),
  due_date: z.date({
    required_error: 'Due date is required',
  }),
  bill_reference: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
});

type BillFormValues = z.infer<typeof billSchema>;

interface EditBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithRelations | null;
  onSubmit: (data: any, items: any[], itemsToDelete: string[]) => Promise<any>;
  isSubmitting: boolean;
}

export function EditBillDialog({
  isOpen,
  onOpenChange,
  bill,
  onSubmit,
  isSubmitting,
}: EditBillDialogProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [costControlItems, setCostControlItems] = useState<any[]>([]);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  
  // Set up form with validation
  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      bill_number: '',
      supplier_id: '',
      issue_date: new Date(),
      due_date: new Date(),
      bill_reference: '',
      description: '',
      notes: '',
      items: [
        {
          description: '',
          quantity: 1,
          unit: '',
          unit_cost: 0,
        },
      ],
    },
  });
  
  // Set up field array for bill items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  // Calculate total amount
  const watchedItems = form.watch('items');
  const totalAmount = watchedItems.reduce((total, item) => {
    return total + (item.quantity || 0) * (item.unit_cost || 0);
  }, 0);
  
  // Populate form when bill changes or dialog opens
  useEffect(() => {
    if (isOpen && bill) {
      setItemsToDelete([]);
      
      const supabase = createClient();
      
      // Fetch suppliers
      const fetchSuppliers = async () => {
        try {
          // Use direct table query instead of missing RPC function
          const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('project_id', bill.project_id);
          
          if (error) throw error;
          setSuppliers(data || []);
        } catch (error) {
          console.error('Error fetching suppliers:', error);
          trackError(error, { context: 'fetch_suppliers_for_edit' });
        }
      };
      
      // Fetch cost control items
      const fetchCostControlItems = async () => {
        try {
          // Use direct table query instead of missing RPC function
          const { data, error } = await supabase
            .from('cost_control_items')
            .select('*')
            .eq('project_id', bill.project_id);
          
          if (error) throw error;
          setCostControlItems(data || []);
        } catch (error) {
          console.error('Error fetching cost control items:', error);
          trackError(error, { context: 'fetch_cost_control_items_for_edit' });
        }
      };
      
      fetchSuppliers();
      fetchCostControlItems();
      
      // Format dates for form
      const issueDate = bill.issue_date ? new Date(bill.issue_date) : new Date();
      const dueDate = bill.due_date ? new Date(bill.due_date) : new Date();
      
      // Format items for form
      const formattedItems = bill.items?.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || '',
        unit_cost: item.unit_cost,
        cost_control_item_id: item.cost_control_item_id === null ? undefined : item.cost_control_item_id,
      })) || [];
      
      // Reset form with bill data
      form.reset({
        bill_number: bill.bill_number,
        supplier_id: bill.supplier_id,
        issue_date: issueDate,
        due_date: dueDate,
        bill_reference: bill.bill_reference || '',
        description: bill.description || '',
        notes: bill.notes || '',
        items: formattedItems.length > 0 ? formattedItems : [
          {
            description: '',
            quantity: 1,
            unit: '',
            unit_cost: 0,
          },
        ],
      });
      
      // Track dialog open
      trackEvent(AnalyticsEventTypes.DIALOG_OPEN, {
        dialog: 'edit_bill',
        bill_id: bill.id,
        bill_number: bill.bill_number,
      });
    }
  }, [isOpen, bill, form]);
  
  // Submit handler
  const handleSubmit = async (values: BillFormValues) => {
    if (!bill) return;
    
    trackEvent(AnalyticsEventTypes.UPDATE, {
      entity: 'bill',
      bill_id: bill.id,
      bill_number: bill.bill_number,
      items_count: values.items.length,
      items_deleted: itemsToDelete.length,
    });
    
    // Prepare bill data
    const billData = {
      bill_number: values.bill_number,
      supplier_id: values.supplier_id,
      issue_date: format(values.issue_date, 'yyyy-MM-dd'),
      due_date: format(values.due_date, 'yyyy-MM-dd'),
      bill_reference: values.bill_reference,
      description: values.description,
      notes: values.notes,
      amount: totalAmount,
    };
    
    // Process bill items
    const billItems = values.items.map(item => ({
      id: item.id, // Keep ID for existing items
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      amount: item.quantity * item.unit_cost,
      cost_control_item_id: typeof item.cost_control_item_id === 'string' ? item.cost_control_item_id : undefined,
    }));
    
    try {
      await onSubmit(billData, billItems, itemsToDelete);
      onOpenChange(false);
    } catch (error) {
      trackError(error, { 
        context: 'edit_bill_submit',
        bill_id: bill.id,
        bill_number: values.bill_number
      });
    }
  };
  
  // Handle removing an item
  const handleRemoveItem = (index: number) => {
    const item = form.getValues(`items.${index}`);
    
    // If item has an ID, add it to itemsToDelete
    if (item.id) {
      setItemsToDelete(prev => [...prev, item.id as string]);
    }
    
    // Remove from form
    remove(index);
  };
  
  if (!bill) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bill</DialogTitle>
          <DialogDescription>
            Edit bill {bill.bill_number}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
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
              
              {/* Supplier field */}
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            </div>
            
            {/* Description field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this bill" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Bill items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <FormLabel className="text-base">Bill Items *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    description: '',
                    quantity: 1,
                    unit: '',
                    unit_cost: 0,
                    cost_control_item_id: undefined,
                    _isNew: true,
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid sm:grid-cols-7 gap-3 p-3 border rounded-md relative">
                    {/* Description */}
                    <div className="sm:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Description *</FormLabel>
                            <FormControl>
                              <Input placeholder="Item description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Quantity */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0.01"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Unit */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unit</FormLabel>
                            <FormControl>
                              <Input placeholder="Unit" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Unit Cost */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_cost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unit Cost *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs">$</span>
                                <Input 
                                  className="pl-6"
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Amount (calculated) */}
                    <div className="flex items-end pb-2">
                      <div>
                        <FormLabel className="text-xs">Amount</FormLabel>
                        <p className="font-medium">
                          ${((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_cost || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Remove button */}
                    {fields.length > 1 && (
                      <div className="flex items-end pb-2 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {form.formState.errors.items?.root && (
                <p className="text-sm text-red-500 mt-2">
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </div>
            
            {/* Total amount */}
            {totalAmount > 0 && (
              <div className="flex justify-end">
                <div className="border-t pt-3 text-right">
                  <span className="font-medium text-gray-700 mr-4">Total:</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 