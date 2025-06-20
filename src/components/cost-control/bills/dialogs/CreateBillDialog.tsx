import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { generateBillNumber } from '@/services/billsService';
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

// Updated billItemSchema without cost_control_item_id
const billItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit: z.string().optional(),
  unit_cost: z.coerce.number().min(0, 'Unit cost must be a positive number'),
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
  cost_control_item_id: z.string().optional(),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
});

type BillFormValues = z.infer<typeof billSchema>;

interface CreateBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSubmit: (data: any, items: any[]) => Promise<any>;
  isSubmitting: boolean;
}

export function CreateBillDialog({
  isOpen,
  onOpenChange,
  projectId,
  onSubmit,
  isSubmitting,
}: CreateBillDialogProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [costControlItems, setCostControlItems] = useState<any[]>([]);
  
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
      cost_control_item_id: 'none',
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
  
  // Fetch suppliers and cost control items
  useEffect(() => {
    if (isOpen) {
      const supabase = createClient();
      
      // Generate bill number
      const generateNumber = async () => {
        try {
          // Call API with project ID to generate a new bill number
          console.log("Generating bill number for project:", projectId);
          const billNumber = await generateBillNumber(projectId);
          console.log("Generated bill number:", billNumber);
          form.setValue('bill_number', billNumber);
        } catch (error) {
          console.error('Error generating bill number:', error);
          // Fallback to a default numbering pattern
          form.setValue('bill_number', `BILL-00001`);
        }
      };
      
      // Fetch suppliers
      const fetchSuppliers = async () => {
        try {
          console.log("Fetching all suppliers");
          
          // Direct query to suppliers table without project_id filter
          const response = await supabase
            .from('suppliers')
            .select('id, name');
          
          console.log("Suppliers query response:", response);
          
          if (response.error) {
            console.error("Suppliers query error:", response.error);
            throw response.error;
          }
          
          // Check if we have data and it's not empty
          if (response.data && response.data.length > 0) {
            console.log("Fetched suppliers:", response.data);
            setSuppliers(response.data);
          } else {
            console.log("No suppliers found");
            setSuppliers([]);
          }
        } catch (error) {
          console.error('Error fetching suppliers:', error);
          trackError(error, { context: 'fetch_suppliers' });
        }
      };
      
      // Fetch cost control items
      const fetchCostControlItems = async () => {
        try {
          console.log("Fetching cost control items for project:", projectId);
          
          // Direct query to cost_control_items table (avoiding RPC which doesn't exist)
          const { data, error } = await supabase
            .from('cost_control_items')
            .select('id, name')
            .eq('project_id', projectId);
          
          if (error) throw error;
          
          console.log("Fetched cost control items:", data ? data.length : 0);
          setCostControlItems(data || []);
        } catch (error) {
          console.error('Error fetching cost control items:', error);
          trackError(error, { context: 'fetch_cost_control_items' });
        }
      };
      
      generateNumber();
      fetchSuppliers();
      fetchCostControlItems();
      
      // Reset form
      form.reset({
        bill_number: form.getValues('bill_number'),
        supplier_id: '',
        issue_date: new Date(),
        due_date: new Date(),
        bill_reference: '',
        description: '',
        notes: '',
        cost_control_item_id: 'none',
        items: [
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
        dialog: 'create_bill',
        project_id: projectId,
      });
    }
  }, [isOpen, projectId, form]);
  
  // Submit handler
  const handleSubmit = async (values: BillFormValues) => {
    console.log("handleSubmit called with values:", values);
    
    trackEvent(AnalyticsEventTypes.CREATE, {
      entity: 'bill',
      supplier_id: values.supplier_id,
      items_count: values.items.length,
      cost_control_item_id: values.cost_control_item_id
    });
    
    // Prepare bill data - remove cost_control_item_id as it doesn't exist in bills table
    const billData = {
      bill_number: values.bill_number,
      supplier_id: values.supplier_id,
      project_id: projectId,
      issue_date: format(values.issue_date, 'yyyy-MM-dd'),
      due_date: format(values.due_date, 'yyyy-MM-dd'),
      bill_reference: values.bill_reference,
      description: values.description,
      notes: values.notes,
      // Remove the cost_control_item_id from bill data
      amount: totalAmount,
      status: 'Pending',
    };
    
    console.log("Prepared bill data:", billData);
    
    // Process bill items and add cost_control_item_id to each item if specified
    const costControlItemId = values.cost_control_item_id === 'none' ? null : values.cost_control_item_id;
    
    const billItems = values.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      amount: item.quantity * item.unit_cost,
      // Add cost_control_item_id to each item if specified at bill level
      cost_control_item_id: costControlItemId
    }));
    
    console.log("Prepared bill items:", billItems);
    
    try {
      console.log("Calling onSubmit with billData and billItems");
      await onSubmit(billData, billItems);
      console.log("onSubmit completed successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      trackError(error, { 
        context: 'create_bill_submit',
        bill_number: values.bill_number
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Bill</DialogTitle>
          <DialogDescription>
            Add a new bill for this project
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
            console.log("Form validation failed with errors:", errors);
          })} className="space-y-5">
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
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.length === 0 ? (
                          <SelectItem value="no-suppliers" disabled>
                            No suppliers found
                          </SelectItem>
                        ) : (
                          suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))
                        )}
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
            
            {/* Cost Control Item field - MOVED UP from previous position */}
            <FormField
              control={form.control}
              name="cost_control_item_id"
              render={({ field }) => (
                <FormItem className="bg-blue-50/50 p-4 rounded-md border border-blue-100">
                  <FormLabel className="flex items-center text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Cost Control Item
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className={field.value && field.value !== 'none' ? "border-blue-300 ring-1 ring-blue-200" : ""}>
                        <SelectValue placeholder="Select cost control item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">None</SelectItem>
                      {costControlItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{item.name}</span>
                            {item.boAmount && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">
                                Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.boAmount)}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 text-xs text-blue-600 flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>Associate this bill with a cost control item to track expenses against your budget. The cost association will apply to all bill items.</span>
                  </div>
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
                          onClick={() => remove(index)}
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
                onClick={() => {
                  console.log("Create Bill button clicked");
                  console.log("Form state:", form.formState);
                  console.log("Form values:", form.getValues());
                  console.log("Form is submitting:", isSubmitting);
                  console.log("Form validation errors:", form.formState.errors);
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Bill'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 