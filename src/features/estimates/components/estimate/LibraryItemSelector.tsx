"use client";

import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { EstimateLibraryWorkflow, LibraryItem } from '@/services/estimateLibraryWorkflow';
import { EstimateService } from '@/lib/services/estimate.service';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/shared/lib/utils';

interface LibraryItemSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  elementId: string;
  projectId: string;
  onItemAdded?: () => void;
}

/**
 * LibraryItemSelector Component
 * Phase 0 Implementation: Library-Only Item Selection
 * 
 * This component implements the Phase 0 workflow where users can only add items
 * from the library to estimates. If an item is not found, it guides them to
 * the quick-add workflow.
 */
export function LibraryItemSelector({
  isOpen,
  onClose,
  elementId,
  projectId,
  onItemAdded
}: LibraryItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [noResultsFound, setNoResultsFound] = useState(false);

  const workflow = new EstimateLibraryWorkflow();

  // Search library items when search term changes
  useEffect(() => {
    const searchDebounced = setTimeout(async () => {
      if (searchTerm.trim().length > 2) {
        setIsLoading(true);
        try {
          const items = await workflow.searchLibrary(searchTerm.trim());
          setSearchResults(items);
          setNoResultsFound(items.length === 0);
        } catch (error) {
          console.error('Error searching library:', error);
          toast.error('Failed to search library');
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setNoResultsFound(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounced);
  }, [searchTerm]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      const result = await workflow.addItemToElement(elementId, searchTerm.trim());
      
      if (result.found && result.items) {
        setSearchResults(result.items);
        setShowQuickAdd(false);
        setNoResultsFound(false);
      } else {
        setSearchResults([]);
        setShowQuickAdd(true);
        setNoResultsFound(true);
      }
    } catch (error) {
      console.error('Error in search workflow:', error);
      toast.error('Failed to search items');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, elementId, workflow]);

  const handleItemSelect = useCallback((item: LibraryItem) => {
    setSelectedItem(item);
  }, []);

  const handleAddItem = useCallback(async () => {
    if (!selectedItem || quantity <= 0) return;

    setIsLoading(true);
    try {
      // Calculate rate and add item using the workflow
      await workflow.calculateAndAddItem(
        elementId,
        selectedItem.id,
        quantity,
        projectId
      );

      toast.success(`Added ${selectedItem.name} to estimate`);
      onItemAdded?.();
      onClose();
      
      // Reset form
      setSelectedItem(null);
      setQuantity(1);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item to estimate');
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem, quantity, elementId, projectId, workflow, onItemAdded, onClose]);

  const handleQuickAdd = useCallback(() => {
    // This will trigger the QuickAddToLibrary component
    setShowQuickAdd(true);
  }, []);

  const resetDialog = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedItem(null);
    setQuantity(1);
    setShowQuickAdd(false);
    setNoResultsFound(false);
  }, []);

  const handleClose = useCallback(() => {
    resetDialog();
    onClose();
  }, [resetDialog, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {showQuickAdd ? 'Add Item to Library' : 'Select Library Item'}
          </DialogTitle>
        </DialogHeader>

        {!showQuickAdd ? (
          <div className="flex flex-col space-y-4 flex-1 overflow-hidden">
            {/* Search Section */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search library items (e.g., concrete, rebar, formwork)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* No Results Message */}
            {noResultsFound && searchTerm.trim().length > 2 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-600 mb-4">
                  No items found for "{searchTerm}"
                </p>
                <Button onClick={handleQuickAdd} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add "{searchTerm}" to Library
                </Button>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="flex-1 overflow-hidden border rounded-lg">
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((item) => (
                        <TableRow 
                          key={item.id}
                          className={`cursor-pointer ${selectedItem?.id === item.id ? 'bg-blue-50' : ''}`}
                          onClick={() => handleItemSelect(item)}
                        >
                          <TableCell className="font-mono text-sm">
                            {item.code}
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'confirmed' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={selectedItem?.id === item.id ? 'default' : 'outline'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemSelect(item);
                              }}
                            >
                              {selectedItem?.id === item.id ? 'Selected' : 'Select'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Selected Item Details */}
            {selectedItem && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold mb-2">Selected Item:</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Code:</span>
                    <p className="font-mono">{selectedItem.code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p>{selectedItem.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Unit:</span>
                    <p>{selectedItem.unit}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={selectedItem.status === 'confirmed' ? 'default' : 'secondary'}>
                      {selectedItem.status}
                    </Badge>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    Quantity ({selectedItem.unit}):
                  </label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min="0.01"
                    step="0.01"
                    className="w-32"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              
              <div className="flex gap-2">
                {searchTerm.trim() && searchResults.length === 0 && !isLoading && (
                  <Button variant="outline" onClick={handleQuickAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Library
                  </Button>
                )}
                
                <Button 
                  onClick={handleAddItem}
                  disabled={!selectedItem || quantity <= 0 || isLoading}
                >
                  {isLoading ? 'Adding...' : `Add to Estimate`}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Quick-add workflow will be implemented here
            </p>
            <Button variant="outline" onClick={() => setShowQuickAdd(false)}>
              Back to Search
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}