/**
 * Phase 2: Create Item Dialog
 * Dialog for creating new library items with proper validation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { CreateLibraryItemRequest, LibraryItem, CreateItemDialogProps } from '../../types/library';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { createClient } from '@/shared/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface AssemblyOption {
  id: string;
  code: string;
  name: string;
  fullPath: string;
  sectionCode: string;
  divisionCode: string;
}

export const CreateItemDialog: React.FC<CreateItemDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData = {},
  preselectedAssembly
}) => {
  const [formData, setFormData] = useState<CreateLibraryItemRequest>({
    name: '',
    description: '',
    unit: '',
    specifications: '',
    wastagePercentage: 0,
    productivityNotes: '',
    code: '',
    assemblyId: '',
    ...initialData
  });
  
  const [assemblies, setAssemblies] = useState<AssemblyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    if (open) {
      loadAssemblies();
      if (preselectedAssembly) {
        setFormData(prev => ({ ...prev, assemblyId: preselectedAssembly }));
      }
    }
  }, [open, preselectedAssembly]);

  const loadAssemblies = async () => {
    try {
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

    if (!formData.assemblyId) {
      errors.push('Assembly selection is required');
    }

    // Code validation (if provided)
    if (formData.code && !/^[\w\-\.]+$/.test(formData.code)) {
      errors.push('Item code can only contain letters, numbers, hyphens, and dots');
    }

    // Wastage percentage validation
    if (formData.wastagePercentage && (formData.wastagePercentage < 0 || formData.wastagePercentage > 100)) {
      errors.push('Wastage percentage must be between 0 and 100');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const newItem = await libraryService.createLibraryItem(formData);
      
      toast.success('Library item created successfully');
      onSuccess(newItem);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        unit: '',
        specifications: '',
        wastagePercentage: 0,
        productivityNotes: '',
        code: '',
        assemblyId: ''
      });
      setValidationErrors([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateLibraryItemRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const getSelectedAssembly = () => {
    return assemblies.find(a => a.id === formData.assemblyId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Library Item</DialogTitle>
          <DialogDescription>
            Create a new library item. It will start as a draft and can be confirmed later after adding factors.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Item Code</Label>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="Auto-generated if empty"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate based on assembly hierarchy
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit*</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                placeholder="e.g., M³, M², EA, KG"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Item Name*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Concrete Grade 25/30"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assembly">Assembly*</Label>
            <Select
              value={formData.assemblyId}
              onValueChange={(value) => handleInputChange('assemblyId', value)}
            >
              <SelectTrigger id="assembly">
                <SelectValue placeholder="Select an assembly" />
              </SelectTrigger>
              <SelectContent>
                {assemblies.map(assembly => (
                  <SelectItem key={assembly.id} value={assembly.id}>
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{assembly.code} - {assembly.name}</div>
                      <div className="text-xs text-muted-foreground">{assembly.fullPath}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getSelectedAssembly() && (
              <div className="text-sm text-muted-foreground">
                Selected: {getSelectedAssembly()?.fullPath}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the item..."
              rows={2}
            />
          </div>

          {/* Advanced Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wastage">Wastage Percentage</Label>
              <Input
                id="wastage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.wastagePercentage || 0}
                onChange={(e) => handleInputChange('wastagePercentage', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specifications">Specifications</Label>
            <Textarea
              id="specifications"
              value={formData.specifications || ''}
              onChange={(e) => handleInputChange('specifications', e.target.value)}
              placeholder="Technical specifications, standards, grades..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Productivity Notes</Label>
            <Textarea
              id="notes"
              value={formData.productivityNotes || ''}
              onChange={(e) => handleInputChange('productivityNotes', e.target.value)}
              placeholder="Notes about productivity, installation methods, etc..."
              rows={2}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This item will be created as a <strong>Draft</strong>. You&apos;ll need to add factors (materials, labor, equipment) 
              and then confirm it to make it available to all users.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};