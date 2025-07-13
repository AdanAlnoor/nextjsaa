/**
 * Phase 2: Quick Add From Estimate Dialog
 * Dialog for quickly adding library items during estimate creation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { QuickAddFromEstimateDialogProps, QuickAddFromEstimateData } from '../../types/library';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { AlertCircle, Plus, Zap, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { toast } from 'react-hot-toast';
import { createClient } from '@/shared/lib/supabase/client';

interface AssemblyOption {
  id: string;
  code: string;
  name: string;
  sectionCode: string;
  divisionCode: string;
  fullPath: string;
}

export const QuickAddFromEstimateDialog: React.FC<QuickAddFromEstimateDialogProps> = ({
  open,
  onOpenChange,
  searchTerm,
  elementId,
  onSuccess,
  divisions
}) => {
  const [formData, setFormData] = useState<Partial<QuickAddFromEstimateData>>({
    name: searchTerm,
    unit: '',
    material_rate: '',
    labour_rate: '',
    equipment_rate: ''
  });
  
  const [assemblies, setAssemblies] = useState<AssemblyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssemblies, setLoadingAssemblies] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    if (open) {
      setFormData({
        name: searchTerm,
        unit: '',
        material_rate: '',
        labour_rate: '',
        equipment_rate: ''
      });
      setValidationErrors([]);
      loadAssemblies();
    }
  }, [open, searchTerm]);

  const loadAssemblies = async () => {
    try {
      setLoadingAssemblies(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('assemblies')
        .select(`
          id,
          code,
          name,
          section:sections(
            code,
            name,
            division:divisions(code, name)
          )
        `)
        .order('code');

      const formatted: AssemblyOption[] = data?.map(a => ({
        id: a.id,
        code: a.code,
        name: a.name,
        sectionCode: a.section?.code || '',
        divisionCode: a.section?.division?.code || '',
        fullPath: `${a.section?.division?.code} > ${a.section?.code} > ${a.code} - ${a.name}`
      })) || [];

      setAssemblies(formatted);
    } catch (error) {
      console.error('Failed to load assemblies:', error);
      toast.error('Failed to load assemblies');
    } finally {
      setLoadingAssemblies(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name?.trim()) {
      errors.push('Item name is required');
    }

    if (!formData.unit?.trim()) {
      errors.push('Unit is required');
    }

    if (!formData.division_id && !formData.assembly_id) {
      errors.push('Division or Assembly selection is required');
    }

    // Validate rates if provided
    if (formData.material_rate && (isNaN(parseFloat(formData.material_rate)) || parseFloat(formData.material_rate) < 0)) {
      errors.push('Material rate must be a valid positive number');
    }

    if (formData.labour_rate && (isNaN(parseFloat(formData.labour_rate)) || parseFloat(formData.labour_rate) < 0)) {
      errors.push('Labour rate must be a valid positive number');
    }

    if (formData.equipment_rate && (isNaN(parseFloat(formData.equipment_rate)) || parseFloat(formData.equipment_rate) < 0)) {
      errors.push('Equipment rate must be a valid positive number');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const quickAddData: QuickAddFromEstimateData = {
        name: formData.name!,
        division_id: formData.division_id,
        assembly_id: formData.assembly_id,
        unit: formData.unit!,
        material_rate: formData.material_rate,
        labour_rate: formData.labour_rate,
        equipment_rate: formData.equipment_rate,
        quick_add_context: {
          element_id: elementId,
          search_term: searchTerm,
          created_from: 'estimate'
        }
      };

      const newItem = await libraryService.quickAddFromEstimate(quickAddData);

      toast.success(`"${newItem.name}" added to library and ready to use`);
      onSuccess(newItem.id);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create library item');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof QuickAddFromEstimateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const getFilteredAssemblies = () => {
    if (!formData.division_id) return assemblies;
    return assemblies.filter(a => a.divisionCode === divisions.find(d => d.id === formData.division_id)?.code);
  };

  const hasRates = formData.material_rate || formData.labour_rate || formData.equipment_rate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Quick Add to Library
          </DialogTitle>
          <DialogDescription>
            &quot;{searchTerm}&quot; not found. Create it as a draft item to use immediately.
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will create a <strong>DRAFT</strong> item. A library manager can review and approve it later.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Item Name*</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Fire-Rated Concrete 2hr"
            />
          </div>

          {/* Unit and Division */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit*</Label>
              <Input
                id="unit"
                value={formData.unit || ''}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                placeholder="m³, kg, etc"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="division">Division*</Label>
              <Select
                value={formData.division_id || ''}
                onValueChange={(value) => {
                  handleInputChange('division_id', value);
                  handleInputChange('assembly_id', undefined); // Clear assembly when division changes
                }}
                disabled={loadingAssemblies}
              >
                <SelectTrigger id="division">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map(div => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.code} - {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assembly (Optional but Recommended) */}
          {formData.division_id && (
            <div className="space-y-2">
              <Label htmlFor="assembly">Assembly (Recommended)</Label>
              <Select
                value={formData.assembly_id || ''}
                onValueChange={(value) => handleInputChange('assembly_id', value)}
                disabled={loadingAssemblies}
              >
                <SelectTrigger id="assembly">
                  <SelectValue placeholder="Select assembly for better organization" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredAssemblies().map(assembly => (
                    <SelectItem key={assembly.id} value={assembly.id}>
                      <div>
                        <div className="font-medium">{assembly.code} - {assembly.name}</div>
                        <div className="text-xs text-muted-foreground">{assembly.fullPath}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quick Rates (Optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Quick Rates (Optional)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="Material"
                  value={formData.material_rate || ''}
                  onChange={(e) => handleInputChange('material_rate', e.target.value)}
                  step="0.01"
                  min="0"
                />
                <Label className="text-xs text-muted-foreground">Material rate</Label>
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Labour"
                  value={formData.labour_rate || ''}
                  onChange={(e) => handleInputChange('labour_rate', e.target.value)}
                  step="0.01"
                  min="0"
                />
                <Label className="text-xs text-muted-foreground">Labour rate</Label>
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Equipment"
                  value={formData.equipment_rate || ''}
                  onChange={(e) => handleInputChange('equipment_rate', e.target.value)}
                  step="0.01"
                  min="0"
                />
                <Label className="text-xs text-muted-foreground">Equipment rate</Label>
              </div>
            </div>
          </div>

          {hasRates && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Quick rates will create basic factors. You can refine them later in the library manager.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.name?.trim() || !formData.unit?.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            {loading ? 'Adding...' : 'Add & Use'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};