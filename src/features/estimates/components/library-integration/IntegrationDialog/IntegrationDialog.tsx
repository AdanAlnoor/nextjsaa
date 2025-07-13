'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { LibraryIntegrationService } from '@/features/estimates/services/libraryIntegrationService';
import type { Database } from '@/shared/types/supabase-schema';
import type { EstimateCreationResult } from '@/features/estimates/types/libraryIntegration';

type LibraryItem = Database['public']['Tables']['library_items']['Row'];

interface IntegrationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: EstimateCreationResult) => void;
  projectId: string;
  structureId: string;
  elementId: string;
  selectedItems: LibraryItem[];
}

export const IntegrationDialog: React.FC<IntegrationDialogProps> = ({
  open,
  onClose,
  onSuccess,
  projectId,
  structureId,
  elementId,
  selectedItems
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateCreationResult | null>(null);

  const handleIntegration = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress('Preparing library items...');

    try {
      const integrationService = LibraryIntegrationService.getInstance();

      // Prepare selections
      const selections = selectedItems.map(item => ({
        libraryItem: item,
        quantity: 1, // Default quantity
        targetStructureId: structureId,
        targetElementId: elementId
      }));

      setProgress('Creating estimate hierarchy...');

      // Create estimate from library items
      const creationResult = await integrationService.createEstimateFromLibraryItems(
        projectId,
        structureId,
        selections
      );

      setResult(creationResult);
      setProgress('Integration complete!');

      // Short delay to show success state
      setTimeout(() => {
        onSuccess(creationResult);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Integration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to integrate library items');
      setIsProcessing(false);
    }
  };

  const getSummaryText = () => {
    if (!result) return '';
    
    const elementCount = result.elements.length;
    const itemCount = result.detailItems.length;
    
    return `Created ${elementCount} hierarchy element${elementCount !== 1 ? 's' : ''} and ${itemCount} detail item${itemCount !== 1 ? 's' : ''}.`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Integrate Library Items</DialogTitle>
          <DialogDescription>
            Adding {selectedItems.length} library item{selectedItems.length !== 1 ? 's' : ''} to your estimate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected Items Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Selected Items:</h4>
            <div className="space-y-1 max-h-32 overflow-auto">
              {selectedItems.map(item => (
                <div key={item.id} className="text-sm text-gray-600">
                  • {item.code} - {item.name}
                </div>
              ))}
            </div>
          </div>

          {/* Progress/Status */}
          {isProcessing && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">{progress}</span>
            </div>
          )}

          {/* Success Message */}
          {result && !error && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {getSummaryText()}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleIntegration}
            disabled={isProcessing || result !== null}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : result ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Done
              </>
            ) : (
              'Integrate Items'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};