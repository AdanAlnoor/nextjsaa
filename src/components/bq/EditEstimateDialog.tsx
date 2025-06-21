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
import { useEffect, useState } from 'react'
import { Database } from '@/types/supabase'
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
type EstimateItem = Database['public']['Tables']['estimate_items']['Row'];
type EstimateItemUpdate = Database['public']['Tables']['estimate_items']['Update'];

interface EditEstimateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: EstimateItemUpdate) => void;
  item: EstimateItem | null;
}

export function EditEstimateDialog({
  isOpen,
  onClose,
  onUpdate,
  item
}: EditEstimateDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    rate: ''  // This is unit_cost in the database
  });

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        quantity: item.quantity !== null ? String(item.quantity) : '',
        unit: item.unit || '',
        rate: item.unit_cost !== null ? String(item.unit_cost) : ''
      });
    }
  }, [item]);

  const handleSubmit = () => {
    if (!item) return;

    // Validate form based on level
    if (item.level === 2) {
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

    const updates: EstimateItemUpdate = {
      name: formData.name
    };

    // Only include these fields for level 2 items
    if (item.level === 2) {
      const quantity = formData.quantity ? parseFloat(formData.quantity) : 0;
      const unit_cost = formData.rate ? parseFloat(formData.rate) : 0;
      
      updates.quantity = quantity;
      updates.unit = formData.unit || '';
      updates.unit_cost = unit_cost;
      
      // Explicitly calculate amount if both quantity and rate are provided
      if (quantity && unit_cost) {
        updates.amount = quantity * unit_cost;
      }
    }

    onUpdate(item.id, updates);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {item?.level === 0 ? 'Structure' : item?.level === 1 ? 'Element' : 'Item'}</DialogTitle>
          <DialogDescription>
            Update the details below to edit this {item?.level === 0 ? 'structure' : item?.level === 1 ? 'element' : 'item'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {item?.level === 2 && (
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
                    <SelectItem value="ton">ton</SelectItem>
                    <SelectItem value="nr">nr</SelectItem>
                    <SelectItem value="sum">sum</SelectItem>
                    <SelectItem value="item">item</SelectItem>
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

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 