# Library-to-Estimate Integration: Missing Components Implementation Guide

## Overview

This document provides a comprehensive implementation guide for completing the missing components in the library-to-estimate integration system. Based on the analysis of the current codebase and implementation status, this guide focuses on the critical components needed to achieve full functionality.

## Table of Contents

1. [Missing Components Summary](#missing-components-summary)
2. [Project-Specific Pricing Services](#project-specific-pricing-services)
3. [Library Management Service](#library-management-service)
4. [Background Jobs & Edge Functions](#background-jobs--edge-functions)
5. [Advanced UI Components](#advanced-ui-components)
6. [Testing Infrastructure](#testing-infrastructure)
7. [Production Deployment](#production-deployment)
8. [Implementation Roadmap](#implementation-roadmap)

## Missing Components Summary

### Critical Components (High Priority)
1. **Project-Specific Pricing Services** - Required for accurate cost calculations
2. **Library Management Service** - Essential for library item lifecycle management
3. **Background Jobs & Edge Functions** - Needed for performance and analytics

### Important Components (Medium Priority)
4. **Advanced UI Components** - Enhances user experience
5. **Testing Infrastructure** - Ensures reliability
6. **Production Deployment** - Required for go-live

## Project-Specific Pricing Services

### Overview
The system needs to support project-specific rates for materials, labor, and equipment that override default catalog rates.

### Implementation Details

#### 1. Create ProjectRatesService

**File**: `src/features/library/services/projectRatesService.ts`

```typescript
import { createClient } from '@/shared/lib/supabase/client';
import { ProjectRates, RateOverride, RateHistory } from '../types/rates';

export class ProjectRatesService {
  private static instance: ProjectRatesService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): ProjectRatesService {
    if (!this.instance) {
      this.instance = new ProjectRatesService();
    }
    return this.instance;
  }

  /**
   * Get current rates for a project
   */
  async getCurrentRates(projectId: string): Promise<ProjectRates> {
    const { data, error } = await this.supabase
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .lte('effective_date', new Date().toISOString())
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Return empty rates if none exist
      return {
        projectId,
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: new Date()
      };
    }

    return {
      projectId: data.project_id,
      materials: data.materials || {},
      labour: data.labour || {},
      equipment: data.equipment || {},
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined
    };
  }

  /**
   * Set rates for a project
   */
  async setProjectRates(
    projectId: string,
    rates: Partial<ProjectRates>
  ): Promise<ProjectRates> {
    const { data, error } = await this.supabase
      .from('project_rates')
      .insert({
        project_id: projectId,
        materials: rates.materials || {},
        labour: rates.labour || {},
        equipment: rates.equipment || {},
        effective_date: rates.effectiveDate || new Date(),
        expiry_date: rates.expiryDate
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToProjectRates(data);
  }

  /**
   * Update specific rate overrides
   */
  async updateRateOverride(
    projectId: string,
    category: 'materials' | 'labour' | 'equipment',
    itemId: string,
    rate: number
  ): Promise<void> {
    const currentRates = await this.getCurrentRates(projectId);
    
    const updatedRates = {
      ...currentRates,
      [category]: {
        ...currentRates[category],
        [itemId]: rate
      }
    };

    await this.setProjectRates(projectId, updatedRates);
  }

  /**
   * Get rate history for a project
   */
  async getRateHistory(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RateHistory[]> {
    let query = this.supabase
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .order('effective_date', { ascending: false });

    if (startDate) {
      query = query.gte('effective_date', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('effective_date', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(this.mapToRateHistory);
  }

  /**
   * Bulk import rates from another project
   */
  async importRatesFromProject(
    targetProjectId: string,
    sourceProjectId: string
  ): Promise<ProjectRates> {
    const sourceRates = await this.getCurrentRates(sourceProjectId);
    return await this.setProjectRates(targetProjectId, {
      materials: sourceRates.materials,
      labour: sourceRates.labour,
      equipment: sourceRates.equipment,
      effectiveDate: new Date()
    });
  }

  private mapToProjectRates(data: any): ProjectRates {
    return {
      projectId: data.project_id,
      materials: data.materials || {},
      labour: data.labour || {},
      equipment: data.equipment || {},
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined
    };
  }

  private mapToRateHistory(data: any): RateHistory {
    return {
      id: data.id,
      projectId: data.project_id,
      rates: {
        materials: data.materials || {},
        labour: data.labour || {},
        equipment: data.equipment || {}
      },
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by
    };
  }
}
```

#### 2. Update FactorCalculatorService

Modify the existing `factorCalculatorService.ts` to use `ProjectRatesService`:

```typescript
// In factorCalculatorService.ts
import { ProjectRatesService } from './projectRatesService';

// Update getProjectRates method
private async getProjectRates(projectId: string): Promise<ProjectRates> {
  const projectRatesService = ProjectRatesService.getInstance();
  return await projectRatesService.getCurrentRates(projectId);
}
```

#### 3. Create Rate Management UI Components

**File**: `src/features/library/components/rates/ProjectRatesManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ProjectRatesService } from '../../services/projectRatesService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/use-toast';

interface ProjectRatesManagerProps {
  projectId: string;
}

export const ProjectRatesManager: React.FC<ProjectRatesManagerProps> = ({ projectId }) => {
  const [rates, setRates] = useState<ProjectRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadRates();
  }, [projectId]);

  const loadRates = async () => {
    try {
      setLoading(true);
      const projectRatesService = ProjectRatesService.getInstance();
      const currentRates = await projectRatesService.getCurrentRates(projectId);
      setRates(currentRates);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load project rates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRateUpdate = async (
    category: 'materials' | 'labour' | 'equipment',
    itemId: string,
    newRate: number
  ) => {
    try {
      const projectRatesService = ProjectRatesService.getInstance();
      await projectRatesService.updateRateOverride(projectId, category, itemId, newRate);
      
      toast({
        title: 'Success',
        description: 'Rate updated successfully'
      });
      
      await loadRates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rate',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Rates</h3>
        <Button
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? 'secondary' : 'default'}
        >
          {editMode ? 'View Mode' : 'Edit Rates'}
        </Button>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labour">Labour</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <RatesList
            rates={rates?.materials || {}}
            category="materials"
            editMode={editMode}
            onUpdate={handleRateUpdate}
          />
        </TabsContent>

        <TabsContent value="labour">
          <RatesList
            rates={rates?.labour || {}}
            category="labour"
            editMode={editMode}
            onUpdate={handleRateUpdate}
          />
        </TabsContent>

        <TabsContent value="equipment">
          <RatesList
            rates={rates?.equipment || {}}
            category="equipment"
            editMode={editMode}
            onUpdate={handleRateUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### Database Schema Updates

Already implemented in `20250712_create_project_rates_table.sql`. No additional changes needed.

## Library Management Service

### Overview
Implement comprehensive CRUD operations and lifecycle management for library items.

### Implementation Details

#### 1. Create LibraryManagementService

**File**: `src/features/library/services/libraryManagementService.ts`

```typescript
import { createClient } from '@/shared/lib/supabase/client';
import { 
  LibraryItem, 
  LibraryItemStatus, 
  LibraryItemDraft,
  BulkOperation,
  LibraryItemVersion
} from '../types/library';

export class LibraryManagementService {
  private static instance: LibraryManagementService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): LibraryManagementService {
    if (!this.instance) {
      this.instance = new LibraryManagementService();
    }
    return this.instance;
  }

  /**
   * Create a new library item (starts as draft)
   */
  async createLibraryItem(draft: LibraryItemDraft): Promise<LibraryItem> {
    const { data, error } = await this.supabase
      .from('library_items')
      .insert({
        ...draft,
        status: 'draft',
        version: 1,
        is_active: false
      })
      .select(`
        *,
        assembly:assemblies(
          *,
          section:sections(
            *,
            division:divisions(*)
          )
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update library item
   */
  async updateLibraryItem(
    itemId: string,
    updates: Partial<LibraryItem>
  ): Promise<LibraryItem> {
    // Create version history before update
    await this.createVersionSnapshot(itemId);

    const { data, error } = await this.supabase
      .from('library_items')
      .update(updates)
      .eq('id', itemId)
      .select(`
        *,
        assembly:assemblies(
          *,
          section:sections(
            *,
            division:divisions(*)
          )
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete library item (soft delete)
   */
  async deleteLibraryItem(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from('library_items')
      .update({ 
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) throw error;
  }

  /**
   * Lifecycle management: Draft → Confirmed → Actual
   */
  async confirmLibraryItem(itemId: string): Promise<LibraryItem> {
    const item = await this.getLibraryItem(itemId);
    
    if (item.status !== 'draft') {
      throw new Error('Only draft items can be confirmed');
    }

    // Validate item has all required factors
    const validation = await this.validateLibraryItem(itemId);
    if (!validation.isValid) {
      throw new Error(`Item validation failed: ${validation.errors.join(', ')}`);
    }

    return await this.updateLibraryItem(itemId, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      is_active: true
    });
  }

  /**
   * Mark item as actual (in use)
   */
  async markAsActual(itemId: string): Promise<LibraryItem> {
    const item = await this.getLibraryItem(itemId);
    
    if (item.status !== 'confirmed') {
      throw new Error('Only confirmed items can be marked as actual');
    }

    return await this.updateLibraryItem(itemId, {
      status: 'actual',
      actual_at: new Date().toISOString()
    });
  }

  /**
   * Bulk operations
   */
  async bulkUpdateStatus(
    itemIds: string[],
    status: LibraryItemStatus
  ): Promise<BulkOperation> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const itemId of itemIds) {
      try {
        if (status === 'confirmed') {
          await this.confirmLibraryItem(itemId);
        } else if (status === 'actual') {
          await this.markAsActual(itemId);
        } else {
          await this.updateLibraryItem(itemId, { status });
        }
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Bulk delete
   */
  async bulkDelete(itemIds: string[]): Promise<BulkOperation> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const itemId of itemIds) {
      try {
        await this.deleteLibraryItem(itemId);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Clone library item
   */
  async cloneLibraryItem(
    sourceItemId: string,
    newCode: string,
    newName: string
  ): Promise<LibraryItem> {
    const source = await this.getLibraryItem(sourceItemId);
    
    // Create new item
    const newItem = await this.createLibraryItem({
      code: newCode,
      name: newName,
      description: source.description,
      unit: source.unit,
      assembly_id: source.assembly_id,
      keywords: source.keywords,
      specifications: source.specifications
    });

    // Clone factors
    await this.cloneFactors(sourceItemId, newItem.id);

    return newItem;
  }

  /**
   * Version control
   */
  async createVersionSnapshot(itemId: string): Promise<void> {
    const item = await this.getLibraryItem(itemId);
    
    const { error } = await this.supabase
      .from('library_item_versions')
      .insert({
        library_item_id: itemId,
        version_number: item.version || 1,
        data: item,
        created_at: new Date().toISOString()
      });

    if (error) console.error('Failed to create version snapshot:', error);
  }

  /**
   * Get version history
   */
  async getVersionHistory(itemId: string): Promise<LibraryItemVersion[]> {
    const { data, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('library_item_id', itemId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Restore from version
   */
  async restoreFromVersion(itemId: string, versionId: string): Promise<LibraryItem> {
    const { data: version, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;

    const restoredData = version.data;
    delete restoredData.id; // Remove ID to avoid conflicts

    return await this.updateLibraryItem(itemId, restoredData);
  }

  /**
   * Search library items
   */
  async searchLibraryItems(params: {
    query?: string;
    status?: LibraryItemStatus;
    divisionId?: string;
    sectionId?: string;
    assemblyId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: LibraryItem[]; total: number }> {
    let query = this.supabase
      .from('library_items')
      .select(`
        *,
        assembly:assemblies(
          *,
          section:sections(
            *,
            division:divisions(*)
          )
        )
      `, { count: 'exact' });

    // Apply filters
    if (params.query) {
      query = query.or(`code.ilike.%${params.query}%,name.ilike.%${params.query}%`);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.assemblyId) {
      query = query.eq('assembly_id', params.assemblyId);
    }
    // Add more filters as needed

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0
    };
  }

  /**
   * Private helper methods
   */
  private async getLibraryItem(itemId: string): Promise<LibraryItem> {
    const { data, error } = await this.supabase
      .from('library_items')
      .select(`
        *,
        assembly:assemblies(
          *,
          section:sections(
            *,
            division:divisions(*)
          )
        )
      `)
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  }

  private async validateLibraryItem(itemId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check if item has at least one factor
    const { data: materialFactors } = await this.supabase
      .from('material_factors')
      .select('id')
      .eq('library_item_id', itemId)
      .limit(1);

    const { data: labourFactors } = await this.supabase
      .from('labor_factors')
      .select('id')
      .eq('library_item_id', itemId)
      .limit(1);

    const { data: equipmentFactors } = await this.supabase
      .from('equipment_factors')
      .select('id')
      .eq('library_item_id', itemId)
      .limit(1);

    const hasFactors = 
      (materialFactors && materialFactors.length > 0) ||
      (labourFactors && labourFactors.length > 0) ||
      (equipmentFactors && equipmentFactors.length > 0);

    if (!hasFactors) {
      errors.push('Item must have at least one factor (material, labour, or equipment)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async cloneFactors(sourceItemId: string, targetItemId: string): Promise<void> {
    // Clone material factors
    const { data: materialFactors } = await this.supabase
      .from('material_factors')
      .select('*')
      .eq('library_item_id', sourceItemId);

    if (materialFactors && materialFactors.length > 0) {
      const clonedMaterials = materialFactors.map(f => ({
        ...f,
        id: undefined,
        library_item_id: targetItemId,
        created_at: undefined,
        updated_at: undefined
      }));

      await this.supabase.from('material_factors').insert(clonedMaterials);
    }

    // Clone labour factors
    const { data: labourFactors } = await this.supabase
      .from('labor_factors')
      .select('*')
      .eq('library_item_id', sourceItemId);

    if (labourFactors && labourFactors.length > 0) {
      const clonedLabour = labourFactors.map(f => ({
        ...f,
        id: undefined,
        library_item_id: targetItemId,
        created_at: undefined,
        updated_at: undefined
      }));

      await this.supabase.from('labor_factors').insert(clonedLabour);
    }

    // Clone equipment factors
    const { data: equipmentFactors } = await this.supabase
      .from('equipment_factors')
      .select('*')
      .eq('library_item_id', sourceItemId);

    if (equipmentFactors && equipmentFactors.length > 0) {
      const clonedEquipment = equipmentFactors.map(f => ({
        ...f,
        id: undefined,
        library_item_id: targetItemId,
        created_at: undefined,
        updated_at: undefined
      }));

      await this.supabase.from('equipment_factors').insert(clonedEquipment);
    }
  }
}
```

#### 2. Create Library Management UI Components

**File**: `src/features/library/components/management/LibraryItemManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { LibraryItem, LibraryItemStatus } from '../../types/library';
import { DataTable } from '@/shared/components/ui/data-table';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Trash, CheckCircle } from 'lucide-react';
import { toast } from '@/shared/components/ui/use-toast';

export const LibraryItemManager: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await libraryService.searchLibraryItems({ limit: 100 });
      setItems(result.items);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load library items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: LibraryItemStatus) => {
    try {
      if (newStatus === 'confirmed') {
        await libraryService.confirmLibraryItem(itemId);
      } else if (newStatus === 'actual') {
        await libraryService.markAsActual(itemId);
      }
      
      toast({
        title: 'Success',
        description: `Item status updated to ${newStatus}`
      });
      
      await loadItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleBulkAction = async (action: 'confirm' | 'delete') => {
    if (selectedItems.length === 0) {
      toast({
        title: 'Warning',
        description: 'No items selected',
        variant: 'destructive'
      });
      return;
    }

    try {
      let result;
      if (action === 'confirm') {
        result = await libraryService.bulkUpdateStatus(selectedItems, 'confirmed');
      } else {
        result = await libraryService.bulkDelete(selectedItems);
      }

      toast({
        title: 'Bulk Operation Complete',
        description: `${result.successful} successful, ${result.failed} failed`
      });

      if (result.errors.length > 0) {
        console.error('Bulk operation errors:', result.errors);
      }

      setSelectedItems([]);
      await loadItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Bulk operation failed',
        variant: 'destructive'
      });
    }
  };

  const columns = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
        />
      )
    },
    {
      accessorKey: 'code',
      header: 'Code'
    },
    {
      accessorKey: 'name',
      header: 'Name'
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as LibraryItemStatus;
        const variant = 
          status === 'draft' ? 'secondary' :
          status === 'confirmed' ? 'default' :
          'success';
        
        return <Badge variant={variant}>{status}</Badge>;
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const item = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.status === 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'confirmed')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm
                </DropdownMenuItem>
              )}
              {item.status === 'confirmed' && (
                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'actual')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Actual
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Library Items</h2>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => handleBulkAction('confirm')}
            disabled={selectedItems.length === 0}
          >
            Bulk Confirm
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleBulkAction('delete')}
            disabled={selectedItems.length === 0}
          >
            Bulk Delete
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onRowSelectionChange={(rows) => {
          setSelectedItems(rows.map(r => r.original.id));
        }}
      />
    </div>
  );
};
```

### Database Schema Updates

Create migration for version control:

**File**: `supabase/migrations/20250713_add_library_versioning.sql`

```sql
-- Create library item versions table
CREATE TABLE IF NOT EXISTS library_item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(library_item_id, version_number)
);

-- Add versioning columns to library_items
ALTER TABLE library_items 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX idx_library_item_versions_item_id ON library_item_versions(library_item_id);
CREATE INDEX idx_library_items_status ON library_items(status);
CREATE INDEX idx_library_items_deleted_at ON library_items(deleted_at);

-- RLS policies
ALTER TABLE library_item_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view library item versions"
  ON library_item_versions FOR SELECT
  USING (true);

CREATE POLICY "Admin users can manage library item versions"
  ON library_item_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );
```

## Background Jobs & Edge Functions

### Overview
Implement background processing for popularity aggregation, price snapshots, and long-running calculations.

### Implementation Details

#### 1. Create Supabase Edge Function for Popularity Aggregation

**File**: `supabase/functions/aggregate-library-popularity/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Aggregate usage data from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get usage statistics
    const { data: usageStats, error: usageError } = await supabaseClient
      .from('estimate_library_usage')
      .select('library_item_id, count(*)')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .group('library_item_id')

    if (usageError) throw usageError

    // Update popularity scores
    for (const stat of usageStats || []) {
      const { error: updateError } = await supabaseClient
        .from('library_item_popularity')
        .upsert({
          library_item_id: stat.library_item_id,
          usage_count_30d: stat.count,
          last_used_at: new Date().toISOString(),
          popularity_score: calculatePopularityScore(stat.count),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'library_item_id'
        })

      if (updateError) {
        console.error('Error updating popularity:', updateError)
      }
    }

    // Clean up old unused items
    const { error: cleanupError } = await supabaseClient
      .from('library_item_popularity')
      .delete()
      .lt('last_used_at', thirtyDaysAgo.toISOString())

    if (cleanupError) {
      console.error('Error cleaning up old data:', cleanupError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: usageStats?.length || 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function calculatePopularityScore(usageCount: number): number {
  // Simple logarithmic scoring
  return Math.log10(usageCount + 1) * 100
}
```

#### 2. Create Edge Function for Price Snapshots

**File**: `supabase/functions/capture-price-snapshot/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectId } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current project rates
    const { data: projectRates, error: ratesError } = await supabaseClient
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()

    if (ratesError) throw ratesError

    // Get all library items used in the project
    const { data: usedItems, error: itemsError } = await supabaseClient
      .from('estimate_detail_items')
      .select('library_item_id')
      .eq('project_id', projectId)
      .not('library_item_id', 'is', null)
      .distinct()

    if (itemsError) throw itemsError

    // Create price snapshot
    const snapshot = {
      project_id: projectId,
      snapshot_date: new Date().toISOString(),
      project_rates: projectRates,
      item_prices: {}
    }

    // Calculate prices for each item
    for (const item of usedItems || []) {
      const { data: calculation } = await supabaseClient.rpc('calculate_library_item_cost', {
        p_library_item_id: item.library_item_id,
        p_project_id: projectId,
        p_quantity: 1
      })

      snapshot.item_prices[item.library_item_id] = calculation
    }

    // Store snapshot
    const { error: snapshotError } = await supabaseClient
      .from('price_snapshots')
      .insert(snapshot)

    if (snapshotError) throw snapshotError

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

#### 3. Create Background Job Scheduler

**File**: `src/features/library/services/backgroundJobService.ts`

```typescript
import { createClient } from '@/shared/lib/supabase/client';

export class BackgroundJobService {
  private static instance: BackgroundJobService;
  private supabase: any;
  private jobs: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): BackgroundJobService {
    if (!this.instance) {
      this.instance = new BackgroundJobService();
    }
    return this.instance;
  }

  /**
   * Schedule popularity aggregation job
   */
  schedulePopularityAggregation(intervalHours: number = 24) {
    const jobId = 'popularity-aggregation';
    
    // Clear existing job if any
    if (this.jobs.has(jobId)) {
      clearInterval(this.jobs.get(jobId)!);
    }

    const job = setInterval(async () => {
      try {
        const { data, error } = await this.supabase.functions.invoke(
          'aggregate-library-popularity'
        );
        
        if (error) {
          console.error('Popularity aggregation failed:', error);
        } else {
          console.log('Popularity aggregation completed:', data);
        }
      } catch (error) {
        console.error('Failed to run popularity aggregation:', error);
      }
    }, intervalHours * 60 * 60 * 1000);

    this.jobs.set(jobId, job);

    // Run immediately
    this.runPopularityAggregation();
  }

  /**
   * Run popularity aggregation manually
   */
  async runPopularityAggregation(): Promise<void> {
    const { data, error } = await this.supabase.functions.invoke(
      'aggregate-library-popularity'
    );
    
    if (error) throw error;
    return data;
  }

  /**
   * Capture price snapshot for a project
   */
  async capturePriceSnapshot(projectId: string): Promise<void> {
    const { data, error } = await this.supabase.functions.invoke(
      'capture-price-snapshot',
      {
        body: { projectId }
      }
    );
    
    if (error) throw error;
    return data;
  }

  /**
   * Schedule price snapshots for all active projects
   */
  schedulePriceSnapshots(intervalDays: number = 7) {
    const jobId = 'price-snapshots';
    
    if (this.jobs.has(jobId)) {
      clearInterval(this.jobs.get(jobId)!);
    }

    const job = setInterval(async () => {
      try {
        // Get all active projects
        const { data: projects, error } = await this.supabase
          .from('projects')
          .select('id')
          .eq('is_active', true);

        if (error) throw error;

        // Capture snapshot for each project
        for (const project of projects || []) {
          try {
            await this.capturePriceSnapshot(project.id);
          } catch (error) {
            console.error(`Failed to capture snapshot for project ${project.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to run price snapshots:', error);
      }
    }, intervalDays * 24 * 60 * 60 * 1000);

    this.jobs.set(jobId, job);
  }

  /**
   * Stop all background jobs
   */
  stopAllJobs() {
    for (const [jobId, job] of this.jobs) {
      clearInterval(job);
    }
    this.jobs.clear();
  }

  /**
   * Long-running factor calculation
   */
  async calculateComplexFactors(
    libraryItemIds: string[],
    projectId: string,
    options: {
      includeIndirectCosts?: boolean;
      includeOverheads?: boolean;
      includeContingency?: boolean;
    } = {}
  ): Promise<any> {
    // For very large calculations, use edge function
    const { data, error } = await this.supabase.functions.invoke(
      'calculate-complex-factors',
      {
        body: {
          libraryItemIds,
          projectId,
          options
        }
      }
    );
    
    if (error) throw error;
    return data;
  }
}
```

### Database Schema for Background Jobs

**File**: `supabase/migrations/20250713_add_background_job_tables.sql`

```sql
-- Price snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_rates JSONB NOT NULL,
  item_prices JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background job logs
CREATE TABLE IF NOT EXISTS background_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_price_snapshots_project_date ON price_snapshots(project_id, snapshot_date);
CREATE INDEX idx_background_job_logs_job_name ON background_job_logs(job_name, started_at);

-- RLS
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_job_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their project snapshots"
  ON price_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = price_snapshots.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage job logs"
  ON background_job_logs FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Advanced UI Components

### Overview
Implement advanced UI components for better user experience.

### Implementation Details

#### 1. Factor Detail Editor (Spreadsheet-style)

**File**: `src/features/library/components/factors/FactorSpreadsheetEditor.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useVirtual } from '@tanstack/react-virtual';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Plus, Trash, Save } from 'lucide-react';
import { MaterialFactor, LabourFactor, EquipmentFactor } from '../../types/factors';

interface FactorSpreadsheetEditorProps {
  libraryItemId: string;
  factorType: 'material' | 'labour' | 'equipment';
  onSave: (factors: any[]) => Promise<void>;
}

export const FactorSpreadsheetEditor: React.FC<FactorSpreadsheetEditorProps> = ({
  libraryItemId,
  factorType,
  onSave
}) => {
  const [factors, setFactors] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const columns = getColumnsForType(factorType);

  useEffect(() => {
    loadFactors();
  }, [libraryItemId, factorType]);

  const loadFactors = async () => {
    // Load factors from API
    // Implementation depends on your API structure
  };

  const handleCellEdit = (rowIndex: number, column: string, value: any) => {
    const updatedFactors = [...factors];
    updatedFactors[rowIndex] = {
      ...updatedFactors[rowIndex],
      [column]: value
    };
    setFactors(updatedFactors);
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const newRow = createEmptyRow(factorType);
    setFactors([...factors, newRow]);
    setIsDirty(true);
  };

  const handleDeleteRow = (index: number) => {
    setFactors(factors.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await onSave(factors);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save factors:', error);
    }
  };

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtual({
    size: factors.length,
    parentRef,
    estimateSize: React.useCallback(() => 40, []),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {factorType.charAt(0).toUpperCase() + factorType.slice(1)} Factors
        </h3>
        <div className="space-x-2">
          <Button onClick={handleAddRow} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Row
          </Button>
          <Button 
            onClick={handleSave} 
            size="sm" 
            disabled={!isDirty}
            variant={isDirty ? 'default' : 'secondary'}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-2 text-left text-sm font-medium">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
          </table>

          <div
            ref={parentRef}
            className="overflow-auto max-h-[400px]"
          >
            <div
              style={{
                height: `${rowVirtualizer.totalSize}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.virtualItems.map((virtualRow) => {
                const factor = factors[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b hover:bg-muted/50">
                          {columns.map(col => (
                            <td key={col.key} className="px-4 py-2">
                              <EditableCell
                                value={factor[col.key]}
                                type={col.type}
                                onChange={(value) => handleCellEdit(virtualRow.index, col.key, value)}
                                isEditing={
                                  editingCell?.row === virtualRow.index && 
                                  editingCell?.col === col.key
                                }
                                onEdit={() => setEditingCell({ row: virtualRow.index, col: col.key })}
                                onBlur={() => setEditingCell(null)}
                              />
                            </td>
                          ))}
                          <td className="px-4 py-2 w-10">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(virtualRow.index)}
                            >
                              <Trash className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components and functions
const EditableCell: React.FC<{
  value: any;
  type: string;
  onChange: (value: any) => void;
  isEditing: boolean;
  onEdit: () => void;
  onBlur: () => void;
}> = ({ value, type, onChange, isEditing, onEdit, onBlur }) => {
  if (isEditing) {
    return (
      <Input
        type={type === 'number' ? 'number' : 'text'}
        value={value || ''}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        onBlur={onBlur}
        autoFocus
        className="h-8"
      />
    );
  }

  return (
    <div 
      onClick={onEdit}
      className="cursor-pointer px-2 py-1 hover:bg-muted rounded"
    >
      {value || '-'}
    </div>
  );
};

function getColumnsForType(type: string) {
  switch (type) {
    case 'material':
      return [
        { key: 'material_code', label: 'Material Code', type: 'text' },
        { key: 'material_name', label: 'Material Name', type: 'text' },
        { key: 'quantity_per_unit', label: 'Quantity/Unit', type: 'number' },
        { key: 'unit', label: 'Unit', type: 'text' },
        { key: 'wastage_percentage', label: 'Wastage %', type: 'number' },
      ];
    case 'labour':
      return [
        { key: 'labor_code', label: 'Labour Code', type: 'text' },
        { key: 'labor_name', label: 'Labour Name', type: 'text' },
        { key: 'hours_per_unit', label: 'Hours/Unit', type: 'number' },
        { key: 'productivity_factor', label: 'Productivity', type: 'number' },
        { key: 'crew_size', label: 'Crew Size', type: 'number' },
      ];
    case 'equipment':
      return [
        { key: 'equipment_code', label: 'Equipment Code', type: 'text' },
        { key: 'equipment_name', label: 'Equipment Name', type: 'text' },
        { key: 'hours_per_unit', label: 'Hours/Unit', type: 'number' },
        { key: 'utilization_factor', label: 'Utilization', type: 'number' },
      ];
    default:
      return [];
  }
}

function createEmptyRow(type: string) {
  switch (type) {
    case 'material':
      return {
        material_code: '',
        material_name: '',
        quantity_per_unit: 1,
        unit: '',
        wastage_percentage: 0
      };
    case 'labour':
      return {
        labor_code: '',
        labor_name: '',
        hours_per_unit: 1,
        productivity_factor: 1,
        crew_size: 1
      };
    case 'equipment':
      return {
        equipment_code: '',
        equipment_name: '',
        hours_per_unit: 1,
        utilization_factor: 1
      };
    default:
      return {};
  }
}
```

#### 2. Bulk Operations Component

**File**: `src/features/library/components/bulk/BulkOperationsPanel.tsx`

```typescript
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { LibraryItem } from '../../types/library';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Card } from '@/shared/components/ui/card';
import { Upload, Download, Copy, Trash } from 'lucide-react';
import { toast } from '@/shared/components/ui/use-toast';

interface BulkOperationsPanelProps {
  selectedItems: LibraryItem[];
  onOperation: (operation: string, items: LibraryItem[]) => Promise<void>;
}

export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  selectedItems,
  onOperation
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    onDrop: async (acceptedFiles) => {
      await handleBulkImport(acceptedFiles[0]);
    }
  });

  const handleBulkImport = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/library/bulk-import', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) throw new Error('Import failed');

      const result = await response.json();
      
      toast({
        title: 'Import Complete',
        description: `Imported ${result.imported} items successfully`
      });
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleBulkExport = async () => {
    try {
      await onOperation('export', selectedItems);
      
      toast({
        title: 'Export Complete',
        description: `Exported ${selectedItems.length} items`
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleBulkClone = async () => {
    setIsProcessing(true);
    try {
      await onOperation('clone', selectedItems);
      
      toast({
        title: 'Clone Complete',
        description: `Cloned ${selectedItems.length} items`
      });
    } catch (error) {
      toast({
        title: 'Clone Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await onOperation('delete', selectedItems);
      
      toast({
        title: 'Delete Complete',
        description: `Deleted ${selectedItems.length} items`
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Bulk Operations</h3>

      <div className="space-y-4">
        {/* Drag & Drop Import */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={isProcessing} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? 'Drop the file here...'
              : 'Drag & drop a CSV or Excel file here, or click to select'}
          </p>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Processing... {progress}%
            </p>
          </div>
        )}

        {/* Bulk Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleBulkExport}
            disabled={selectedItems.length === 0 || isProcessing}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Selected
          </Button>

          <Button
            onClick={handleBulkClone}
            disabled={selectedItems.length === 0 || isProcessing}
            variant="outline"
          >
            <Copy className="w-4 h-4 mr-2" />
            Clone Selected
          </Button>

          <Button
            onClick={handleBulkDelete}
            disabled={selectedItems.length === 0 || isProcessing}
            variant="destructive"
            className="col-span-2"
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete Selected ({selectedItems.length})
          </Button>
        </div>

        {/* Status */}
        {selectedItems.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {selectedItems.length} items selected
          </p>
        )}
      </div>
    </Card>
  );
};
```

#### 3. Advanced Filter Interface

**File**: `src/features/library/components/filters/AdvancedFilterPanel.tsx`

```typescript
import React, { useState } from 'react';
import { LibraryItemStatus } from '../../types/library';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Slider } from '@/shared/components/ui/slider';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Badge } from '@/shared/components/ui/badge';
import { X, Search } from 'lucide-react';

interface FilterCriteria {
  search?: string;
  status?: LibraryItemStatus[];
  divisionId?: string;
  sectionId?: string;
  assemblyId?: string;
  priceRange?: [number, number];
  hasFactors?: boolean;
  isActive?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

interface AdvancedFilterPanelProps {
  onFilterChange: (criteria: FilterCriteria) => void;
  divisions: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; divisionId: string }>;
  assemblies: Array<{ id: string; name: string; sectionId: string }>;
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  onFilterChange,
  divisions,
  sections,
  assemblies
}) => {
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const updateFilter = (key: keyof FilterCriteria, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Track active filters
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      setActiveFilters(activeFilters.filter(f => f !== key));
    } else if (!activeFilters.includes(key)) {
      setActiveFilters([...activeFilters, key]);
    }
    
    onFilterChange(newFilters);
  };

  const clearFilter = (key: keyof FilterCriteria) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    setActiveFilters(activeFilters.filter(f => f !== key));
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
    setActiveFilters([]);
    onFilterChange({});
  };

  // Filter sections based on selected division
  const filteredSections = filters.divisionId
    ? sections.filter(s => s.divisionId === filters.divisionId)
    : sections;

  // Filter assemblies based on selected section
  const filteredAssemblies = filters.sectionId
    ? assemblies.filter(a => a.sectionId === filters.sectionId)
    : assemblies;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by code or name..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(filter => (
            <Badge key={filter} variant="secondary" className="gap-1">
              {filter}
              <button
                onClick={() => clearFilter(filter as keyof FilterCriteria)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Sections */}
      <Accordion type="multiple" className="w-full">
        {/* Status Filter */}
        <AccordionItem value="status">
          <AccordionTrigger>Status</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {(['draft', 'confirmed', 'actual'] as LibraryItemStatus[]).map(status => (
                <label key={status} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status) || false}
                    onChange={(e) => {
                      const currentStatuses = filters.status || [];
                      if (e.target.checked) {
                        updateFilter('status', [...currentStatuses, status]);
                      } else {
                        updateFilter('status', currentStatuses.filter(s => s !== status));
                      }
                    }}
                  />
                  <span className="text-sm capitalize">{status}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Hierarchy Filter */}
        <AccordionItem value="hierarchy">
          <AccordionTrigger>Hierarchy</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div>
                <Label htmlFor="division">Division</Label>
                <Select
                  value={filters.divisionId || ''}
                  onValueChange={(value) => {
                    updateFilter('divisionId', value || undefined);
                    // Clear dependent filters
                    updateFilter('sectionId', undefined);
                    updateFilter('assemblyId', undefined);
                  }}
                >
                  <SelectTrigger id="division">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Divisions</SelectItem>
                    {divisions.map(div => (
                      <SelectItem key={div.id} value={div.id}>
                        {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="section">Section</Label>
                <Select
                  value={filters.sectionId || ''}
                  onValueChange={(value) => {
                    updateFilter('sectionId', value || undefined);
                    // Clear dependent filter
                    updateFilter('assemblyId', undefined);
                  }}
                  disabled={!filters.divisionId}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sections</SelectItem>
                    {filteredSections.map(sec => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assembly">Assembly</Label>
                <Select
                  value={filters.assemblyId || ''}
                  onValueChange={(value) => updateFilter('assemblyId', value || undefined)}
                  disabled={!filters.sectionId}
                >
                  <SelectTrigger id="assembly">
                    <SelectValue placeholder="Select assembly" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Assemblies</SelectItem>
                    {filteredAssemblies.map(asm => (
                      <SelectItem key={asm.id} value={asm.id}>
                        {asm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range Filter */}
        <AccordionItem value="price">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="px-2">
                <Slider
                  value={filters.priceRange || [0, 10000]}
                  onValueChange={(value) => updateFilter('priceRange', value)}
                  max={10000}
                  step={100}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${filters.priceRange?.[0] || 0}</span>
                <span>${filters.priceRange?.[1] || 10000}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Additional Filters */}
        <AccordionItem value="additional">
          <AccordionTrigger>Additional Filters</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="has-factors">Has Factors</Label>
                <Switch
                  id="has-factors"
                  checked={filters.hasFactors || false}
                  onCheckedChange={(checked) => updateFilter('hasFactors', checked || undefined)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is-active">Active Only</Label>
                <Switch
                  id="is-active"
                  checked={filters.isActive || false}
                  onCheckedChange={(checked) => updateFilter('isActive', checked || undefined)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
```

## Testing Infrastructure

### Overview
Implement comprehensive testing for all components and services.

### Implementation Details

#### 1. Unit Tests for Services

**File**: `src/features/library/services/__tests__/projectRatesService.test.ts`

```typescript
import { ProjectRatesService } from '../projectRatesService';
import { createClient } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');

describe('ProjectRatesService', () => {
  let service: ProjectRatesService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = ProjectRatesService.getInstance();
  });

  describe('getCurrentRates', () => {
    it('should return current rates for a project', async () => {
      const mockRates = {
        project_id: 'project-123',
        materials: { 'mat-1': 100 },
        labour: { 'lab-1': 50 },
        equipment: { 'eq-1': 200 },
        effective_date: new Date().toISOString()
      };

      mockSupabase.single.mockResolvedValue({ data: mockRates, error: null });

      const result = await service.getCurrentRates('project-123');

      expect(result).toEqual({
        projectId: 'project-123',
        materials: { 'mat-1': 100 },
        labour: { 'lab-1': 50 },
        equipment: { 'eq-1': 200 },
        effectiveDate: expect.any(Date)
      });
    });

    it('should return empty rates if none exist', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: 'Not found' });

      const result = await service.getCurrentRates('project-123');

      expect(result).toEqual({
        projectId: 'project-123',
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: expect.any(Date)
      });
    });
  });

  describe('updateRateOverride', () => {
    it('should update a specific rate override', async () => {
      const currentRates = {
        project_id: 'project-123',
        materials: { 'mat-1': 100 },
        labour: {},
        equipment: {},
        effective_date: new Date().toISOString()
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: currentRates, error: null })
        .mockResolvedValueOnce({ data: { ...currentRates, materials: { 'mat-1': 150 } }, error: null });

      await service.updateRateOverride('project-123', 'materials', 'mat-1', 150);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-123',
          materials: { 'mat-1': 150 }
        })
      );
    });
  });
});
```

**File**: `src/features/library/services/__tests__/libraryManagementService.test.ts`

```typescript
import { LibraryManagementService } from '../libraryManagementService';
import { createClient } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');

describe('LibraryManagementService', () => {
  let service: LibraryManagementService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = LibraryManagementService.getInstance();
  });

  describe('createLibraryItem', () => {
    it('should create a new library item as draft', async () => {
      const draft = {
        code: 'TEST001',
        name: 'Test Item',
        description: 'Test Description',
        unit: 'EA',
        assembly_id: 'assembly-123'
      };

      const expectedItem = {
        ...draft,
        id: 'item-123',
        status: 'draft',
        version: 1,
        is_active: false
      };

      mockSupabase.single.mockResolvedValue({ data: expectedItem, error: null });

      const result = await service.createLibraryItem(draft);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...draft,
          status: 'draft',
          version: 1,
          is_active: false
        })
      );
      expect(result).toEqual(expectedItem);
    });
  });

  describe('confirmLibraryItem', () => {
    it('should confirm a draft item', async () => {
      const draftItem = {
        id: 'item-123',
        status: 'draft',
        name: 'Test Item'
      };

      const confirmedItem = {
        ...draftItem,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        is_active: true
      };

      // Mock getting the item
      mockSupabase.single
        .mockResolvedValueOnce({ data: draftItem, error: null })
        // Mock validation check - has factors
        .mockResolvedValueOnce({ data: [{ id: 'factor-1' }], error: null })
        // Mock update
        .mockResolvedValueOnce({ data: confirmedItem, error: null });

      const result = await service.confirmLibraryItem('item-123');

      expect(result.status).toBe('confirmed');
      expect(result.is_active).toBe(true);
    });

    it('should throw error if item is not draft', async () => {
      const confirmedItem = {
        id: 'item-123',
        status: 'confirmed',
        name: 'Test Item'
      };

      mockSupabase.single.mockResolvedValueOnce({ data: confirmedItem, error: null });

      await expect(service.confirmLibraryItem('item-123')).rejects.toThrow(
        'Only draft items can be confirmed'
      );
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple items status', async () => {
      const itemIds = ['item-1', 'item-2', 'item-3'];
      
      // Mock successful updates
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'item-1', status: 'draft' }, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'factor-1' }], error: null })
        .mockResolvedValueOnce({ data: { id: 'item-1', status: 'confirmed' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'item-2', status: 'draft' }, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'factor-2' }], error: null })
        .mockResolvedValueOnce({ data: { id: 'item-2', status: 'confirmed' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'item-3', status: 'draft' }, error: null })
        .mockResolvedValueOnce({ data: [], error: null }); // No factors - will fail

      const result = await service.bulkUpdateStatus(itemIds, 'confirmed');

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('searchLibraryItems', () => {
    it('should search items with filters', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Item 1', code: 'CODE1' },
        { id: 'item-2', name: 'Item 2', code: 'CODE2' }
      ];

      mockSupabase.range.mockResolvedValue({ 
        data: mockItems, 
        error: null, 
        count: 2 
      });

      const result = await service.searchLibraryItems({
        query: 'Item',
        status: 'confirmed',
        limit: 10,
        offset: 0
      });

      expect(mockSupabase.or).toHaveBeenCalledWith(
        'code.ilike.%Item%,name.ilike.%Item%'
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'confirmed');
      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(2);
    });
  });
});
```

#### 2. Integration Tests

**File**: `src/features/library/__tests__/integration/library-estimate-flow.test.ts`

```typescript
import { LibraryIntegrationService } from '@/features/estimates/services/libraryIntegrationService';
import { LibraryManagementService } from '@/features/library/services/libraryManagementService';
import { ProjectRatesService } from '@/features/library/services/projectRatesService';
import { setupTestDatabase, teardownTestDatabase } from '@/test/utils/database';

describe('Library to Estimate Integration Flow', () => {
  let libraryIntegrationService: LibraryIntegrationService;
  let libraryManagementService: LibraryManagementService;
  let projectRatesService: ProjectRatesService;
  
  let testProjectId: string;
  let testStructureId: string;
  let testLibraryItemId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
    libraryIntegrationService = LibraryIntegrationService.getInstance();
    libraryManagementService = LibraryManagementService.getInstance();
    projectRatesService = ProjectRatesService.getInstance();

    // Create test data
    const { projectId, structureId } = await createTestProject();
    testProjectId = projectId;
    testStructureId = structureId;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Complete Integration Flow', () => {
    it('should create library item and integrate into estimate', async () => {
      // Step 1: Create library item
      const libraryItem = await libraryManagementService.createLibraryItem({
        code: 'INT001',
        name: 'Integration Test Item',
        unit: 'M2',
        assembly_id: 'test-assembly-id'
      });

      expect(libraryItem.status).toBe('draft');

      // Step 2: Add factors
      // ... Add material, labour, equipment factors

      // Step 3: Confirm library item
      const confirmedItem = await libraryManagementService.confirmLibraryItem(libraryItem.id);
      expect(confirmedItem.status).toBe('confirmed');

      // Step 4: Set project rates
      await projectRatesService.setProjectRates(testProjectId, {
        materials: { 'mat-1': 100 },
        labour: { 'lab-1': 50 },
        equipment: { 'eq-1': 200 }
      });

      // Step 5: Create estimate from library
      const selections = [{
        item: confirmedItem,
        quantity: 10,
        elementId: null
      }];

      const result = await libraryIntegrationService.createEstimateFromLibraryItems(
        testProjectId,
        testStructureId,
        selections
      );

      expect(result.elements).toHaveLength(3); // Division, Section, Assembly
      expect(result.detailItems).toHaveLength(1);
      expect(result.detailItems[0].library_item_id).toBe(confirmedItem.id);
      expect(result.detailItems[0].quantity).toBe(10);
    });

    it('should handle bulk library integration', async () => {
      // Create multiple library items
      const items = await Promise.all([
        libraryManagementService.createLibraryItem({
          code: 'BULK001',
          name: 'Bulk Item 1',
          unit: 'M3',
          assembly_id: 'assembly-1'
        }),
        libraryManagementService.createLibraryItem({
          code: 'BULK002',
          name: 'Bulk Item 2',
          unit: 'M2',
          assembly_id: 'assembly-1'
        }),
        libraryManagementService.createLibraryItem({
          code: 'BULK003',
          name: 'Bulk Item 3',
          unit: 'EA',
          assembly_id: 'assembly-2'
        })
      ]);

      // Confirm all items
      const confirmedItems = await Promise.all(
        items.map(item => libraryManagementService.confirmLibraryItem(item.id))
      );

      // Create selections
      const selections = confirmedItems.map(item => ({
        item,
        quantity: Math.random() * 100,
        elementId: null
      }));

      // Integrate into estimate
      const result = await libraryIntegrationService.createEstimateFromLibraryItems(
        testProjectId,
        testStructureId,
        selections
      );

      expect(result.detailItems).toHaveLength(3);
      expect(result.elements.length).toBeGreaterThanOrEqual(3); // At least Division, Section, Assembly
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid library items gracefully', async () => {
      const invalidSelections = [{
        item: { id: 'non-existent', name: 'Invalid' },
        quantity: 10,
        elementId: null
      }];

      const result = await libraryIntegrationService.createEstimateFromLibraryItems(
        testProjectId,
        testStructureId,
        invalidSelections
      );

      expect(result.elements).toHaveLength(0);
      expect(result.detailItems).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should rollback on partial failure', async () => {
      // Test transaction rollback behavior
      // Implementation depends on your transaction handling
    });
  });
});

// Helper functions
async function createTestProject() {
  // Create test project and structure
  // Return IDs for use in tests
  return {
    projectId: 'test-project-id',
    structureId: 'test-structure-id'
  };
}
```

#### 3. E2E Tests

**File**: `e2e/library-estimate-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Library to Estimate Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to project
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    await page.goto('/projects/test-project/estimate');
  });

  test('should add library items to estimate', async ({ page }) => {
    // Open library browser
    await page.click('button:has-text("Add from Library")');
    
    // Wait for library dialog
    await page.waitForSelector('[role="dialog"]');
    
    // Navigate hierarchy
    await page.click('text=02 - Sitework');
    await page.click('text=02.10 - Site Preparation');
    await page.click('text=02.10.10 - Site Clearing');
    
    // Select items
    await page.check('input[type="checkbox"][value="item-1"]');
    await page.check('input[type="checkbox"][value="item-2"]');
    
    // Set quantities
    await page.fill('input[name="quantity-item-1"]', '100');
    await page.fill('input[name="quantity-item-2"]', '200');
    
    // Add to estimate
    await page.click('button:has-text("Add to Estimate")');
    
    // Verify items added
    await expect(page.locator('text=Site Clearing')).toBeVisible();
    await expect(page.locator('text=100')).toBeVisible();
    await expect(page.locator('text=200')).toBeVisible();
  });

  test('should update rates from project settings', async ({ page }) => {
    // Navigate to project rates
    await page.goto('/projects/test-project/settings/rates');
    
    // Update material rate
    await page.click('button:has-text("Edit Rates")');
    await page.fill('input[name="material-rate-mat001"]', '150');
    await page.click('button:has-text("Save")');
    
    // Navigate back to estimate
    await page.goto('/projects/test-project/estimate');
    
    // Verify rate update reflected
    const rateElement = await page.locator('[data-testid="rate-mat001"]');
    await expect(rateElement).toHaveText('$150.00');
  });

  test('should handle bulk operations', async ({ page }) => {
    // Select multiple items
    await page.check('input[type="checkbox"][data-row="1"]');
    await page.check('input[type="checkbox"][data-row="2"]');
    await page.check('input[type="checkbox"][data-row="3"]');
    
    // Open bulk actions
    await page.click('button:has-text("Bulk Actions")');
    
    // Clone selected
    await page.click('button:has-text("Clone Selected")');
    
    // Verify cloned items
    await expect(page.locator('tr[data-cloned="true"]')).toHaveCount(3);
  });

  test('should filter library items', async ({ page }) => {
    // Open library browser
    await page.click('button:has-text("Add from Library")');
    
    // Apply filters
    await page.fill('input[placeholder="Search..."]', 'concrete');
    await page.click('button:has-text("Status")');
    await page.check('label:has-text("Confirmed")');
    
    // Verify filtered results
    const items = await page.locator('[data-library-item]').count();
    expect(items).toBeGreaterThan(0);
    
    // Verify all items are confirmed
    const statuses = await page.locator('[data-status="confirmed"]').count();
    expect(statuses).toBe(items);
  });
});
```

#### 4. Performance Tests

**File**: `src/features/library/__tests__/performance/library-performance.test.ts`

```typescript
import { performance } from 'perf_hooks';
import { LibraryIntegrationService } from '@/features/estimates/services/libraryIntegrationService';
import { generateMockLibraryItems } from '@/test/utils/mockData';

describe('Library Performance Tests', () => {
  let service: LibraryIntegrationService;

  beforeAll(() => {
    service = LibraryIntegrationService.getInstance();
  });

  test('should handle 1000 library items efficiently', async () => {
    const items = generateMockLibraryItems(1000);
    
    const startTime = performance.now();
    
    const result = await service.createEstimateFromLibraryItems(
      'perf-test-project',
      'perf-test-structure',
      items.map(item => ({ item, quantity: 1, elementId: null }))
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.detailItems).toHaveLength(1000);
  });

  test('should efficiently search large library', async () => {
    // Simulate searching in a library with 10,000 items
    const searchParams = {
      query: 'concrete',
      status: 'confirmed',
      limit: 50
    };
    
    const startTime = performance.now();
    
    // Perform search
    const results = await service.searchLibraryItems(searchParams);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(500); // Should complete within 500ms
    expect(results.items.length).toBeLessThanOrEqual(50);
  });

  test('should handle concurrent operations', async () => {
    const operations = Array(10).fill(null).map((_, index) => 
      service.createEstimateFromLibraryItems(
        `project-${index}`,
        `structure-${index}`,
        generateMockLibraryItems(100).map(item => ({ 
          item, 
          quantity: 1, 
          elementId: null 
        }))
      )
    );
    
    const startTime = performance.now();
    
    const results = await Promise.all(operations);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result.detailItems).toHaveLength(100);
    });
  });
});
```

## Production Deployment

### Overview
Set up CI/CD pipelines and deployment procedures.

### Implementation Details

#### 1. GitHub Actions Workflow

**File**: `.github/workflows/library-integration-deploy.yml`

```yaml
name: Library Integration Deployment

on:
  push:
    branches: [main]
    paths:
      - 'src/features/library/**'
      - 'src/features/estimates/**'
      - 'supabase/migrations/**'
      - 'supabase/functions/**'
  pull_request:
    branches: [main]

env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
  SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type check
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:unit -- --coverage
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info

  deploy-edge-functions:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Supabase CLI
      uses: supabase/setup-cli@v1
      with:
        version: latest
    
    - name: Deploy Edge Functions
      run: |
        supabase link --project-ref $SUPABASE_PROJECT_ID
        supabase functions deploy aggregate-library-popularity
        supabase functions deploy capture-price-snapshot
        supabase functions deploy calculate-complex-factors

  deploy-database:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Supabase CLI
      uses: supabase/setup-cli@v1
      with:
        version: latest
    
    - name: Run migrations
      run: |
        supabase link --project-ref $SUPABASE_PROJECT_ID
        supabase db push

  deploy-application:
    needs: [deploy-edge-functions, deploy-database]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    
    - name: Deploy to Vercel
      uses: vercel/action@v1
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  e2e-tests:
    needs: deploy-application
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        PLAYWRIGHT_BASE_URL: ${{ secrets.PRODUCTION_URL }}
```

#### 2. Monitoring Setup

**File**: `src/features/library/monitoring/libraryMetrics.ts`

```typescript
import { Logger } from '@/shared/monitoring/logger';

export class LibraryMetrics {
  private static instance: LibraryMetrics;
  
  static getInstance(): LibraryMetrics {
    if (!this.instance) {
      this.instance = new LibraryMetrics();
    }
    return this.instance;
  }

  /**
   * Track library item usage
   */
  trackItemUsage(itemId: string, projectId: string, context: any) {
    Logger.info('Library item used', {
      itemId,
      projectId,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track integration performance
   */
  trackIntegrationPerformance(
    operation: string,
    duration: number,
    itemCount: number
  ) {
    Logger.info('Integration performance', {
      operation,
      duration,
      itemCount,
      itemsPerSecond: itemCount / (duration / 1000)
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context: any) {
    Logger.error('Library integration error', {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Track factor calculations
   */
  trackFactorCalculation(
    libraryItemId: string,
    calculationTime: number,
    factorCount: number
  ) {
    Logger.info('Factor calculation completed', {
      libraryItemId,
      calculationTime,
      factorCount,
      averageTimePerFactor: calculationTime / factorCount
    });
  }
}
```

#### 3. Database Backup Procedures

**File**: `scripts/backup-library-data.sh`

```bash
#!/bin/bash

# Library Data Backup Script
# Run this before major updates or migrations

set -e

# Configuration
SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_ID}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DB_URL=${DATABASE_URL}

# Create backup directory
mkdir -p $BACKUP_DIR

echo "Starting library data backup..."

# Backup library tables
tables=(
  "divisions"
  "sections"
  "assemblies"
  "library_items"
  "material_factors"
  "labor_factors"
  "equipment_factors"
  "library_item_popularity"
  "library_item_versions"
  "project_rates"
  "price_snapshots"
)

for table in "${tables[@]}"
do
  echo "Backing up $table..."
  pg_dump $DB_URL \
    --table=$table \
    --data-only \
    --format=custom \
    --file=$BACKUP_DIR/${table}.backup
done

# Create metadata file
cat > $BACKUP_DIR/metadata.json << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tables": ${tables[@]},
  "project_id": "$SUPABASE_PROJECT_ID"
}
EOF

echo "Backup completed: $BACKUP_DIR"

# Upload to cloud storage (optional)
# aws s3 sync $BACKUP_DIR s3://your-backup-bucket/library-backups/
```

#### 4. Rollback Procedures

**File**: `scripts/rollback-library-migration.sql`

```sql
-- Rollback script for library integration
-- Use this if deployment fails and rollback is needed

BEGIN;

-- Restore from backup point
-- This assumes you've created a backup before deployment

-- Remove new columns from estimate tables
ALTER TABLE estimate_elements 
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS is_from_library;

ALTER TABLE estimate_detail_items
DROP COLUMN IF EXISTS library_item_id,
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS is_from_library,
DROP COLUMN IF EXISTS rate_calculated,
DROP COLUMN IF EXISTS factor_breakdown;

-- Drop new tables
DROP TABLE IF EXISTS library_item_versions CASCADE;
DROP TABLE IF EXISTS price_snapshots CASCADE;
DROP TABLE IF EXISTS background_job_logs CASCADE;
DROP TABLE IF EXISTS estimate_library_usage CASCADE;
DROP TABLE IF EXISTS library_item_popularity CASCADE;

-- Remove functions
DROP FUNCTION IF EXISTS update_library_item_popularity CASCADE;
DROP FUNCTION IF EXISTS calculate_library_item_cost CASCADE;

-- Remove indexes
DROP INDEX IF EXISTS idx_library_items_status;
DROP INDEX IF EXISTS idx_library_items_deleted_at;
DROP INDEX IF EXISTS idx_library_item_versions_item_id;

COMMIT;
```

## Implementation Roadmap

### Phase 1: Core Services (Week 1)
1. **Day 1-2**: Implement ProjectRatesService
   - Create service class
   - Add rate management methods
   - Create UI components
   - Write unit tests

2. **Day 3-4**: Implement LibraryManagementService
   - Create service class
   - Add CRUD operations
   - Implement lifecycle management
   - Add bulk operations

3. **Day 5**: Integration Testing
   - Test service interactions
   - Verify data flow
   - Fix integration issues

### Phase 2: Background Jobs (Week 2, Days 1-3)
1. **Day 1**: Create Edge Functions
   - Popularity aggregation
   - Price snapshots
   - Complex calculations

2. **Day 2**: Implement BackgroundJobService
   - Job scheduling
   - Manual triggers
   - Error handling

3. **Day 3**: Testing & Optimization
   - Test edge functions
   - Optimize performance
   - Add monitoring

### Phase 3: UI Components (Week 2, Days 4-5)
1. **Day 4**: Advanced Components
   - Factor spreadsheet editor
   - Bulk operations panel
   - Advanced filters

2. **Day 5**: Integration & Polish
   - Connect to services
   - Add animations
   - Mobile optimization

### Phase 4: Testing & Deployment (Week 3)
1. **Days 1-2**: Comprehensive Testing
   - Unit tests
   - Integration tests
   - E2E tests
   - Performance tests

2. **Days 3-4**: Production Setup
   - CI/CD pipeline
   - Monitoring
   - Documentation
   - Training materials

3. **Day 5**: Deployment & Validation
   - Deploy to staging
   - Run acceptance tests
   - Deploy to production
   - Monitor metrics

## Success Metrics

1. **Performance Metrics**
   - Library search: < 500ms for 10k items
   - Bulk operations: < 10s for 1000 items
   - Factor calculations: < 100ms per item

2. **Quality Metrics**
   - Test coverage: > 80%
   - Zero critical bugs in production
   - All services documented

3. **User Adoption Metrics**
   - 90% of estimates use library items
   - < 5% error rate in integrations
   - Positive user feedback

## Conclusion

This implementation guide provides a comprehensive roadmap for completing the missing components in the library-to-estimate integration system. Following this guide will result in a robust, scalable, and user-friendly system that significantly improves the construction estimation workflow.

The phased approach ensures that critical components are implemented first, with proper testing at each stage. The inclusion of monitoring, backup procedures, and rollback scripts ensures production readiness and operational excellence.