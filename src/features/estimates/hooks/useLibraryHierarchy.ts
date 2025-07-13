import { useState, useCallback, useEffect } from 'react';
import { CacheManager, cacheKeys } from '../utils/cache';

interface Division {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface Section {
  id: string;
  code: string;
  name: string;
  description?: string;
  division_id: string;
}

interface Assembly {
  id: string;
  code: string;
  name: string;
  description?: string;
  section_id: string;
}

interface LibraryItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  assembly_id: string;
  material_factors?: any;
  labour_factors?: any;
  equipment_factors?: any;
}

interface HierarchyData {
  divisions?: Division[];
  sections?: Section[];
  assemblies?: Assembly[];
  items?: LibraryItem[];
}

export const useLibraryHierarchy = () => {
  const [data, setData] = useState<HierarchyData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = CacheManager.getInstance();

  const fetchHierarchy = useCallback(async (
    divisionId?: string,
    sectionId?: string,
    assemblyId?: string,
    search?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cacheKey = cacheKeys.libraryHierarchy(divisionId, sectionId, assemblyId);
      if (!search) {
        const cached = cache.get<HierarchyData>(cacheKey);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          return cached;
        }
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (divisionId) params.append('divisionId', divisionId);
      if (sectionId) params.append('sectionId', sectionId);
      if (assemblyId) params.append('assemblyId', assemblyId);
      if (search) params.append('search', search);

      const response = await fetch(`/api/library/hierarchy?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch hierarchy: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch hierarchy');
      }

      // Cache the result if no search
      if (!search) {
        cache.set(cacheKey, result.data, 10 * 60 * 1000); // 10 minutes
      }

      setData(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hierarchy';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  const clearCache = useCallback(() => {
    cache.clearPattern('library:hierarchy:');
  }, [cache]);

  return {
    data,
    isLoading,
    error,
    fetchHierarchy,
    clearCache
  };
};