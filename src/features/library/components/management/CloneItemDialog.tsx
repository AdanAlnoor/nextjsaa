/**
 * Phase 2: Clone Item Dialog
 * Dialog for cloning existing library items
 */

'use client';

import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { LibraryItem, CloneItemDialogProps } from '../../types/library';
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
import { Badge } from '@/shared/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Copy, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export const CloneItemDialog: React.FC<CloneItemDialogProps> = ({
  open,
  onOpenChange,
  sourceItemId,
  onSuccess
}) => {
  const [sourceItem, setSourceItem] = useState<LibraryItem | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    if (open && sourceItemId) {
      loadSourceItem();
    }
  }, [open, sourceItemId]);

  const loadSourceItem = async () => {
    try {
      setLoadingSource(true);
      const item = await libraryService.getLibraryItem(sourceItemId);
      setSourceItem(item);
      
      // Pre-populate with modified values
      setNewCode(''); // Let it auto-generate
      setNewName(`${item.name} (Copy)`);
      setNewDescription(item.description ? `Cloned from ${item.code}: ${item.description}` : `Cloned from ${item.code}`);
    } catch (error: any) {
      toast.error('Failed to load source item');
      console.error('Load source item error:', error);
    } finally {
      setLoadingSource(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!newName?.trim()) {
      errors.push('New item name is required');
    }

    // Code validation (if provided)
    if (newCode && !/^[\w\-\.]+$/.test(newCode)) {
      errors.push('Item code can only contain letters, numbers, hyphens, and dots');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleClone = async () => {
    if (!validateForm() || !sourceItem) {
      return;
    }

    setLoading(true);
    try {
      const modifications: Partial<LibraryItem> = {};
      
      if (newDescription !== sourceItem.description) {
        modifications.description = newDescription;
      }

      const clonedItem = await libraryService.cloneLibraryItem(
        sourceItemId,
        newCode || '', // Empty string will trigger auto-generation
        newName,
        modifications
      );
      
      toast.success('Item cloned successfully');
      onSuccess(clonedItem);
      
      // Reset form
      setNewCode('');
      setNewName('');
      setNewDescription('');
      setValidationErrors([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to clone item');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'confirmed': return 'default';
      case 'actual': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return '📝';
      case 'confirmed': return '✅';
      case 'actual': return '⭐';
      default: return '📦';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Clone Library Item
          </DialogTitle>
          <DialogDescription>
            Create a copy of an existing library item with all its factors and specifications.
          </DialogDescription>
        </DialogHeader>

        {loadingSource ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading source item...</div>
          </div>
        ) : !sourceItem ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive">Failed to load source item</div>
          </div>
        ) : (
          <>
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

            {/* Source Item Information */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Source Item</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Code:</div>
                  <div className="font-mono">{sourceItem.code}</div>
                </div>
                <div>
                  <div className="font-medium">Status:</div>
                  <Badge variant={getStatusBadgeVariant(sourceItem.status)} className="gap-1">
                    <span>{getStatusIcon(sourceItem.status)}</span>
                    {sourceItem.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <div className="font-medium">Name:</div>
                  <div>{sourceItem.name}</div>
                </div>
                <div>
                  <div className="font-medium">Unit:</div>
                  <div>{sourceItem.unit}</div>
                </div>
                <div>
                  <div className="font-medium">Assembly:</div>
                  <div>{sourceItem.assembly?.code} - {sourceItem.assembly?.name}</div>
                </div>
                {sourceItem.description && (
                  <div className="col-span-2">
                    <div className="font-medium">Description:</div>
                    <div className="text-muted-foreground">{sourceItem.description}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Clone Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium">Clone Configuration</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-code">New Item Code</Label>
                  <Input
                    id="new-code"
                    value={newCode}
                    onChange={(e) => handleInputChange(setNewCode, e.target.value)}
                    placeholder="Auto-generated if empty"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate based on assembly
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-name">New Item Name*</Label>
                  <Input
                    id="new-name"
                    value={newName}
                    onChange={(e) => handleInputChange(setNewName, e.target.value)}
                    placeholder="Enter name for cloned item"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-description">New Description</Label>
                <Textarea
                  id="new-description"
                  value={newDescription}
                  onChange={(e) => handleInputChange(setNewDescription, e.target.value)}
                  placeholder="Description for the cloned item"
                  rows={3}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>What will be cloned:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>All item properties (unit, specifications, wastage percentage, etc.)</li>
                    <li>All material factors with quantities and rates</li>
                    <li>All labor factors with hours and rates</li>
                    <li>All equipment factors with hours and rates</li>
                    <li>The clone will start as a <strong>Draft</strong> status</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClone}
            disabled={loading || loadingSource || !sourceItem || !newName.trim()}
          >
            {loading ? 'Cloning...' : 'Clone Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};