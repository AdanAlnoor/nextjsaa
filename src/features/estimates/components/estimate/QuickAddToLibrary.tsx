"use client";

import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { EstimateLibraryWorkflow } from '@/services/estimateLibraryWorkflow';
import { createClient } from '@/shared/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { ChevronRight, Plus } from 'lucide-react';

interface QuickAddToLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  prefillName?: string;
  onItemCreated?: (libraryItemId: string) => void;
}

interface Division {
  id: string;
  name: string;
  code: string;
}

interface Section {
  id: string;
  name: string;
  code: string;
  division_id: string;
}

interface Assembly {
  id: string;
  name: string;
  code: string;
  section_id: string;
}

/**
 * QuickAddToLibrary Component
 * Phase 0 Implementation: Fast Draft Item Creation
 * 
 * This component allows users to quickly add missing items to the library
 * as draft items when they're not found during search.
 */
export function QuickAddToLibrary({
  isOpen,
  onClose,
  prefillName = '',
  onItemCreated
}: QuickAddToLibraryProps) {
  const [formData, setFormData] = useState({
    name: prefillName,
    unit: '',
    description: '',
    division_id: '',
    section_id: '',
    assembly_id: ''
  });

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);

  const supabase = createClient();
  const workflow = new EstimateLibraryWorkflow();

  // Common construction units
  const commonUnits = [
    'm', 'm²', 'm³', 'kg', 'ton', 'each', 'nr', 'hr', 'day', 'L', 'set', 'item'
  ];

  // Load divisions on mount
  useEffect(() => {
    if (isOpen) {
      loadDivisions();
    }
  }, [isOpen]);

  // Update prefilled name when prop changes
  useEffect(() => {
    if (prefillName) {
      setFormData(prev => ({ ...prev, name: prefillName }));
    }
  }, [prefillName]);

  // Load sections when division changes
  useEffect(() => {
    if (formData.division_id) {
      loadSections(formData.division_id);
    } else {
      setSections([]);
      setAssemblies([]);
      setFormData(prev => ({ ...prev, section_id: '', assembly_id: '' }));
    }
  }, [formData.division_id]);

  // Load assemblies when section changes
  useEffect(() => {
    if (formData.section_id) {
      loadAssemblies(formData.section_id);
    } else {
      setAssemblies([]);
      setFormData(prev => ({ ...prev, assembly_id: '' }));
    }
  }, [formData.section_id]);

  const loadDivisions = useCallback(async () => {
    setIsLoadingHierarchy(true);
    try {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name, code')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setDivisions(data || []);
    } catch (error) {
      console.error('Error loading divisions:', error);
      toast.error('Failed to load divisions');
    } finally {
      setIsLoadingHierarchy(false);
    }
  }, [supabase]);

  const loadSections = useCallback(async (divisionId: string) => {
    setIsLoadingHierarchy(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, code, division_id')
        .eq('division_id', divisionId)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error loading sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setIsLoadingHierarchy(false);
    }
  }, [supabase]);

  const loadAssemblies = useCallback(async (sectionId: string) => {
    setIsLoadingHierarchy(true);
    try {
      const { data, error } = await supabase
        .from('assemblies')
        .select('id, name, code, section_id')
        .eq('section_id', sectionId)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setAssemblies(data || []);
    } catch (error) {
      console.error('Error loading assemblies:', error);
      toast.error('Failed to load assemblies');
    } finally {
      setIsLoadingHierarchy(false);
    }
  }, [supabase]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    if (!formData.unit.trim()) {
      toast.error('Unit is required');
      return;
    }

    if (!formData.assembly_id) {
      toast.error('Please select an assembly');
      return;
    }

    setIsLoading(true);
    try {
      // Create draft library item using the workflow
      const libraryItem = await workflow.quickAddToLibrary({
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        assembly_id: formData.assembly_id,
        description: formData.description.trim()
      });

      toast.success(`Added "${libraryItem.name}" to library as draft`);
      onItemCreated?.(libraryItem.id);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating library item:', error);
      toast.error('Failed to add item to library');
    } finally {
      setIsLoading(false);
    }
  }, [formData, workflow, onItemCreated, onClose]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      unit: '',
      description: '',
      division_id: '',
      section_id: '',
      assembly_id: ''
    });
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const isFormValid = formData.name.trim() && formData.unit.trim() && formData.assembly_id;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick Add to Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Special Waterproof Concrete"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={(value) => handleInputChange('unit', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  {commonUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the item..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Library Hierarchy */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-700">Library Classification *</h4>
            
            {/* Division */}
            <div>
              <Label htmlFor="division">Division</Label>
              <Select 
                value={formData.division_id} 
                onValueChange={(value) => handleInputChange('division_id', value)}
                disabled={isLoadingHierarchy}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select division..." />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.code} - {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section */}
            <div>
              <Label htmlFor="section">Section</Label>
              <Select 
                value={formData.section_id} 
                onValueChange={(value) => handleInputChange('section_id', value)}
                disabled={!formData.division_id || isLoadingHierarchy}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.code} - {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assembly */}
            <div>
              <Label htmlFor="assembly">Assembly</Label>
              <Select 
                value={formData.assembly_id} 
                onValueChange={(value) => handleInputChange('assembly_id', value)}
                disabled={!formData.section_id || isLoadingHierarchy}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select assembly..." />
                </SelectTrigger>
                <SelectContent>
                  {assemblies.map((assembly) => (
                    <SelectItem key={assembly.id} value={assembly.id}>
                      {assembly.code} - {assembly.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-1">What happens next?</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Item will be created as "draft" status</li>
              <li>• Auto-generated code will be assigned</li>
              <li>• Item becomes immediately available for estimates</li>
              <li>• Admin can later add factors and confirm the item</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Library
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}