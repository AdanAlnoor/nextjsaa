import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import { Database } from '@/types/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Download } from 'lucide-react'
import { ExcelImport } from '../estimate/ExcelImport'
import { downloadExcelTemplate } from '@/lib/excel-template'
import { toast } from 'sonner'

// Predefined units for the dropdown
const UNITS = [
  'm',
  'm2',
  'm3',
  'kg',
  'ton',
  'nr',
  'sum',
  'item'
] as const;

type Unit = typeof UNITS[number];
type EstimateItemInsert = Database['public']['Tables']['estimate_items']['Insert'];

interface AddEstimateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Database['public']['Tables']['estimate_items']['Insert']) => void;
  level: 0 | 1 | 2;
  parentId: string | null;
  projectId: string;
  currentOrder: number;
}

export function AddEstimateDialog({
  isOpen,
  onClose,
  onAdd,
  level,
  parentId,
  projectId,
  currentOrder
}: AddEstimateDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    rate: ''
  });

  const handleSubmit = () => {
    // Validate form based on level
    if (level === 2) {
      // For Level 2, all these fields are required
      if (!formData.name || !formData.quantity || !formData.unit || !formData.rate) {
        toast.error('All fields are required for detailed items');
        return; // Prevent submission
      }
    } else {
      // For Level 0/1, only name is required
      if (!formData.name) {
        toast.error('Name is required');
        return;
      }
    }

    console.log(`Creating a Level ${level} item with ${level === 0 ? 'NULL' : 'parent_id: ' + parentId}`);
    
    // Parse numeric values as floats
    const quantity = level === 2 ? parseFloat(formData.quantity) : 0;
    const rate = level === 2 ? parseFloat(formData.rate) : 0;
    
    const item: Database['public']['Tables']['estimate_items']['Insert'] = {
      name: formData.name,
      project_id: projectId,
      parent_id: parentId,
      level: level,
      order: currentOrder + 1,
      is_parent: level < 2,
      
      // For Level 2, provide actual values, for Level 0/1 use defaults
      quantity: quantity,
      unit: level === 2 ? formData.unit : '',
      unit_cost: rate, // Use unit_cost to match the type definition
      
      // Explicitly calculate amount for level 2 items
      amount: level === 2 ? quantity * rate : 0
    };

    console.log('Submitting item:', JSON.stringify(item, null, 2));
    onAdd(item);
    setFormData({
      name: '',
      quantity: '',
      unit: '',
      rate: ''
    });
  };

  const handleImport = async (items: Database['public']['Tables']['estimate_items']['Insert'][]) => {
    try {
      console.log('Received items for import:', items);
      
      // Add each item
      for (const item of items) {
        try {
          console.log(`Adding item:`, item);
          await onAdd(item);
        } catch (itemError) {
          console.error(`Error adding item:`, itemError);
          throw itemError; // Re-throw to be caught by outer try-catch
        }
      }

      toast.success('Items imported successfully');
      onClose();
    } catch (error) {
      console.error('Error in handleImport:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      toast.error('Failed to add items', {
        description: error instanceof Error ? error.message : 'There was an error adding the imported items.'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {level === 0 ? 'Structure' : level === 1 ? 'Element' : 'Item'}</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new {level === 0 ? 'structure' : level === 1 ? 'element' : 'item'}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="excel">Excel Import</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {level === 2 && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Quantity</label>
                    <Input
                      type="number"
                      placeholder="Enter quantity"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Unit</label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="m3">m³</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="nr">nr</SelectItem>
                        <SelectItem value="sum">sum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Rate</label>
                    <Input
                      type="number"
                      placeholder="Enter rate"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    />
                  </div>
                </>
              )}

              <Button onClick={handleSubmit} className="w-full">
                Add {level === 0 ? 'Structure' : level === 1 ? 'Element' : 'Item'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="excel" className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground">
                Download the template and fill it with your items, then upload it back to import multiple items at once.
              </div>

              <Button 
                variant="outline" 
                onClick={downloadExcelTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>

              <ExcelImport
                parentId={parentId || ''}
                projectId={projectId}
                level={level}
                currentOrder={currentOrder}
                onImport={handleImport}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 