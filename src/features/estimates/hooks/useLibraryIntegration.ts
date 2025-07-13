import { useState, useCallback } from 'react';
import type { LibraryItemSelection, EstimateCreationResult } from '../types/libraryIntegration';
import type { Database } from '@/shared/types/supabase-schema';

type LibraryItem = Database['public']['Tables']['library_items']['Row'];

export const useLibraryIntegration = (projectId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<EstimateCreationResult[]>([]);

  const integrateItems = useCallback(async (
    structureId: string,
    elementId: string,
    items: LibraryItem[],
    quantities: { [itemId: string]: number }
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const selections: LibraryItemSelection[] = items.map(item => ({
        item: item,
        quantity: quantities[item.id] || 1,
        structureId: structureId,
        elementId: elementId
      }));

      const response = await fetch('/api/estimates/library/integrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          structureId,
          selections
        })
      });

      if (!response.ok) {
        throw new Error('Integration failed');
      }

      const result = await response.json();
      if (result.success) {
        setResults(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Integration failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Integration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const validateSelection = useCallback(async (
    items: LibraryItem[]
  ): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];

    // Validate items have required fields
    for (const item of items) {
      if (!item.id) {
        errors.push(`Item ${item.description} is missing ID`);
      }
      if (!item.unit) {
        errors.push(`Item ${item.description} is missing unit`);
      }
    }

    // Check for duplicate items
    const itemIds = items.map(i => i.id);
    const uniqueIds = new Set(itemIds);
    if (itemIds.length !== uniqueIds.size) {
      errors.push('Duplicate items selected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    integrateItems,
    validateSelection,
    clearResults,
    isLoading,
    error,
    results
  };
};