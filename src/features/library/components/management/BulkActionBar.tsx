/**
 * Phase 2: Bulk Action Bar
 * Component for performing bulk operations on selected library items
 */

'use client';

import React, { useState } from 'react';
import { BulkActionBarProps } from '../../types/library';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  Star, 
  RotateCcw, 
  Trash, 
  X,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onBulkAction,
  onClearSelection,
  availableActions = ['confirm', 'mark_actual', 'revert_to_draft', 'delete', 'restore']
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleBulkAction = async (action: string) => {
    const actionNames: Record<string, string> = {
      confirm: 'confirm items',
      mark_actual: 'mark items as actual',
      revert_to_draft: 'revert items to draft',
      delete: 'delete items',
      restore: 'restore items'
    };

    const actionName = actionNames[action] || action;
    
    if (!confirm(`Are you sure you want to ${actionName} for ${selectedCount} selected items?`)) {
      return;
    }

    setIsProcessing(true);
    setProcessingAction(action);
    
    try {
      await onBulkAction(action);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'confirm':
        return <CheckCircle className="w-4 h-4" />;
      case 'mark_actual':
        return <Star className="w-4 h-4" />;
      case 'revert_to_draft':
        return <RotateCcw className="w-4 h-4" />;
      case 'delete':
        return <Trash className="w-4 h-4" />;
      case 'restore':
        return <RotateCcw className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'confirm':
        return 'Confirm Selected';
      case 'mark_actual':
        return 'Mark as Actual';
      case 'revert_to_draft':
        return 'Revert to Draft';
      case 'delete':
        return 'Delete Selected';
      case 'restore':
        return 'Restore Selected';
      default:
        return action;
    }
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'confirm':
        return 'Change status from draft to confirmed (requires valid factors)';
      case 'mark_actual':
        return 'Change status from confirmed to actual (production ready)';
      case 'revert_to_draft':
        return 'Change status back to draft (makes items inactive)';
      case 'delete':
        return 'Move items to recycle bin (soft delete)';
      case 'restore':
        return 'Restore items from recycle bin';
      default:
        return '';
    }
  };

  const getActionVariant = (action: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (action) {
      case 'delete':
        return 'destructive';
      case 'confirm':
      case 'mark_actual':
        return 'default';
      case 'revert_to_draft':
      case 'restore':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-blue-900">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing {processingAction}...
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Action Buttons */}
          {availableActions.includes('confirm') && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleBulkAction('confirm')}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Confirm
            </Button>
          )}

          {availableActions.includes('delete') && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('delete')}
              disabled={isProcessing}
            >
              <Trash className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}

          {/* More Actions Dropdown */}
          {availableActions.length > 2 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isProcessing}>
                  More Actions
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {availableActions
                  .filter(action => !['confirm', 'delete'].includes(action))
                  .map((action) => (
                    <DropdownMenuItem
                      key={action}
                      onClick={() => handleBulkAction(action)}
                      className="flex flex-col items-start p-3"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {getActionIcon(action)}
                        {getActionLabel(action)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getActionDescription(action)}
                      </div>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenuSeparator />

          {/* Clear Selection */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <Alert className="mt-3 bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Bulk Operations:</strong> Actions will be applied to all selected items. 
          Items that don&apos;t meet requirements (e.g., confirming items without factors) will be skipped and reported.
        </AlertDescription>
      </Alert>
    </div>
  );
};