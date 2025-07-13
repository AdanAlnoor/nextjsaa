'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCostControl } from '@/cost-control/context/CostControlContext'

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  parent_id: z.string().optional(),
  bo_amount: z.coerce.number().min(0),
  actual_amount: z.coerce.number().min(0),
  paid_bills: z.coerce.number().min(0),
  external_bills: z.coerce.number().min(0),
  pending_bills: z.coerce.number().min(0),
  wages: z.coerce.number().min(0),
  is_parent: z.boolean().default(false),
  level: z.coerce.number().min(0).default(0),
  order_index: z.coerce.number().min(0).default(0),
})

type FormValues = z.infer<typeof formSchema>

interface AddCostControlItemFormProps {
  projectId: string
  parentItems: { id: string; name: string }[]
  onItemAdded: () => void
}

export function AddCostControlItemForm({ 
  projectId, 
  parentItems,
  onItemAdded 
}: AddCostControlItemFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addCostControlItem } = useCostControl()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bo_amount: 0,
      actual_amount: 0,
      paid_bills: 0,
      external_bills: 0,
      pending_bills: 0,
      wages: 0,
      is_parent: false,
      level: 0,
      order_index: 0,
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true)
      
      // If parent is selected, set the level accordingly
      if (values.parent_id) {
        // Convert "top_level" to empty string
        if (values.parent_id === "top_level") {
          values.parent_id = "";
          values.level = 0; // Top level
        } else {
          values.level = 1; // Child level
        }
      } else {
        values.level = 0; // Top level
      }
      
      const result = await addCostControlItem(projectId, values)
      
      if (result) {
        toast.success('Cost control item added successfully')
        form.reset()
        setOpen(false)
        onItemAdded()
      } else {
        toast.error('Failed to add cost control item')
      }
    } catch (error) {
      console.error('Error adding cost control item:', error)
      toast.error('An error occurred while adding the item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Cost Control Item</DialogTitle>
          <DialogDescription>
            Create a new cost control item for this project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Site Works" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Item (optional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="top_level">None (Top Level)</SelectItem>
                      {parentItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bo_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BO Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="actual_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paid_bills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Bills</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="external_bills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Bills</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pending_bills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pending Bills</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="wages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wages</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_parent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Parent Item</FormLabel>
                    <p className="text-sm text-gray-500">
                      Parent items can contain child items
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 