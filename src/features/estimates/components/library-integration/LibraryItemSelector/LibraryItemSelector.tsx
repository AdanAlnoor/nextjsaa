'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { LibraryBrowser } from '../LibraryBrowser';
import { FactorPreview } from '../FactorPreview';
import type { LibraryItemSelectorProps } from './LibraryItemSelector.types';
import type { Database } from '@/shared/types/supabase-schema';

type LibraryItem = Database['public']['Tables']['library_items']['Row'] & {
  assembly?: Database['public']['Tables']['assemblies']['Row'] & {
    section?: Database['public']['Tables']['sections']['Row'] & {
      division?: Database['public']['Tables']['divisions']['Row'];
    };
  };
};

export const LibraryItemSelector: React.FC<LibraryItemSelectorProps> = ({
  open,
  onClose,
  onItemsSelected,
  projectId,
  structureId,
  elementId,
  allowMultiple = true,
  showFactorPreview = true,
  preSelectedItems = []
}) => {
  const [selectedItems, setSelectedItems] = useState<LibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedItems([]);
      setSearchQuery('');
    }
  }, [open]);

  const handleItemToggle = (item: LibraryItem) => {
    if (allowMultiple) {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) {
          return prev.filter(i => i.id !== item.id);
        }
        return [...prev, item];
      });
    } else {
      setSelectedItems([item]);
    }
  };

  const handleConfirm = async () => {
    if (selectedItems.length === 0) return;

    setIsLoading(true);
    try {
      await onItemsSelected(selectedItems);
      setSelectedItems([]);
      onClose();
    } catch (error) {
      console.error('Error selecting items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Library Items for Estimate</DialogTitle>
          <DialogDescription>
            Choose library items to add to your estimate. Use the search to find specific items or browse by category.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-[calc(90vh-200px)]">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search library items by name, code, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-6 flex-1 min-h-0">
            {/* Left Panel: Library Browser */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-auto border rounded-lg">
                <LibraryBrowser
                  searchQuery={searchQuery}
                  selectedItems={selectedItems}
                  onItemSelect={handleItemToggle}
                  showSelection={true}
                  allowMultiple={allowMultiple}
                  projectId={projectId}
                />
              </div>
            </div>

            {/* Right Panel: Factor Preview */}
            {showFactorPreview && selectedItems.length > 0 && (
              <div className="w-96 flex-shrink-0">
                <FactorPreview
                  items={selectedItems}
                  projectId={projectId}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedItems.length === 0 || isLoading}
          >
            {isLoading ? 'Adding...' : `Add ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''} to Estimate`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};