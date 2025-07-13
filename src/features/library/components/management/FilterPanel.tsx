/**
 * Phase 2: Filter Panel
 * Component for filtering library items with advanced options
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FilterPanelProps, LibraryManagementFilter } from '../../types/library';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { createClient } from '@/shared/lib/supabase/client';
import { 
  Filter, 
  X, 
  Calendar,
  Building,
  Package,
  User,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';

interface HierarchyOption {
  id: string;
  code: string;
  name: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onClear,
  divisions = [],
  sections = [],
  assemblies = []
}) => {
  const [localFilters, setLocalFilters] = useState<LibraryManagementFilter>(filters);
  const [hierarchyData, setHierarchyData] = useState({
    divisions: divisions,
    sections: sections,
    assemblies: assemblies
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (divisions.length === 0) {
      loadHierarchyData();
    }
  }, []);

  const loadHierarchyData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Load divisions
      const { data: divisionsData } = await supabase
        .from('divisions')
        .select('id, code, name')
        .order('code');

      // Load sections
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, code, name, division_id')
        .order('code');

      // Load assemblies
      const { data: assembliesData } = await supabase
        .from('assemblies')
        .select('id, code, name, section_id')
        .order('code');

      setHierarchyData({
        divisions: divisionsData || [],
        sections: sectionsData || [],
        assemblies: assembliesData || []
      });
    } catch (error) {
      console.error('Failed to load hierarchy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof LibraryManagementFilter, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    
    // Clear dependent filters when parent changes
    if (key === 'divisionId') {
      newFilters.sectionId = undefined;
      newFilters.assemblyId = undefined;
    } else if (key === 'sectionId') {
      newFilters.assemblyId = undefined;
    }
    
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const getFilteredSections = () => {
    if (!localFilters.divisionId) return hierarchyData.sections;
    return hierarchyData.sections.filter(s => 
      (s as any).division_id === localFilters.divisionId
    );
  };

  const getFilteredAssemblies = () => {
    if (!localFilters.sectionId) return hierarchyData.assemblies;
    return hierarchyData.assemblies.filter(a => 
      (a as any).section_id === localFilters.sectionId
    );
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).filter(v => v !== undefined && v !== null && v !== '').length;
  };

  const clearAllFilters = () => {
    setLocalFilters({});
    onClear();
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
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <h3 className="font-medium">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          disabled={getActiveFilterCount() === 0}
        >
          <X className="w-4 h-4 mr-1" />
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Status
          </Label>
          <Select
            value={localFilters.status || ''}
            onValueChange={(value) => handleFilterChange('status', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="draft">
                <div className="flex items-center gap-2">
                  <span>📝</span>
                  Draft
                </div>
              </SelectItem>
              <SelectItem value="confirmed">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  Confirmed
                </div>
              </SelectItem>
              <SelectItem value="actual">
                <div className="flex items-center gap-2">
                  <span>⭐</span>
                  Actual
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Division Filter */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Division
          </Label>
          <Select
            value={localFilters.divisionId || ''}
            onValueChange={(value) => handleFilterChange('divisionId', value || undefined)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="All divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All divisions</SelectItem>
              {hierarchyData.divisions.map(division => (
                <SelectItem key={division.id} value={division.id}>
                  {division.code} - {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Section Filter */}
        <div className="space-y-2">
          <Label>Section</Label>
          <Select
            value={localFilters.sectionId || ''}
            onValueChange={(value) => handleFilterChange('sectionId', value || undefined)}
            disabled={loading || !localFilters.divisionId}
          >
            <SelectTrigger>
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All sections</SelectItem>
              {getFilteredSections().map(section => (
                <SelectItem key={section.id} value={section.id}>
                  {section.code} - {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assembly Filter */}
        <div className="space-y-2">
          <Label>Assembly</Label>
          <Select
            value={localFilters.assemblyId || ''}
            onValueChange={(value) => handleFilterChange('assemblyId', value || undefined)}
            disabled={loading || !localFilters.sectionId}
          >
            <SelectTrigger>
              <SelectValue placeholder="All assemblies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All assemblies</SelectItem>
              {getFilteredAssemblies().map(assembly => (
                <SelectItem key={assembly.id} value={assembly.id}>
                  {assembly.code} - {assembly.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filters */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Created After
          </Label>
          <Input
            type="date"
            value={localFilters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Created Before
          </Label>
          <Input
            type="date"
            value={localFilters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
          />
        </div>

        {/* Boolean Filters */}
        <div className="space-y-3">
          <Label>Options</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={localFilters.isActive === true}
              onCheckedChange={(checked) => 
                handleFilterChange('isActive', checked === true ? true : undefined)
              }
            />
            <Label htmlFor="isActive" className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-3 h-3" />
              Active items only
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasFactors"
              checked={localFilters.hasFactors === true}
              onCheckedChange={(checked) => 
                handleFilterChange('hasFactors', checked === true ? true : undefined)
              }
            />
            <Label htmlFor="hasFactors" className="flex items-center gap-2 text-sm">
              <Package className="w-3 h-3" />
              Has factors
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showDeleted"
              checked={localFilters.showDeleted === true}
              onCheckedChange={(checked) => 
                handleFilterChange('showDeleted', checked === true ? true : undefined)
              }
            />
            <Label htmlFor="showDeleted" className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-3 h-3" />
              Include deleted
            </Label>
          </div>
        </div>

        {/* User Filter */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Created By
          </Label>
          <Input
            placeholder="User ID"
            value={localFilters.createdBy || ''}
            onChange={(e) => handleFilterChange('createdBy', e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">Active filters:</div>
          <div className="flex flex-wrap gap-2">
            {localFilters.status && (
              <Badge variant="outline" className="gap-1">
                <span>{getStatusIcon(localFilters.status)}</span>
                {localFilters.status}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleFilterChange('status', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {localFilters.divisionId && (
              <Badge variant="outline">
                Division: {hierarchyData.divisions.find(d => d.id === localFilters.divisionId)?.code}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleFilterChange('divisionId', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {localFilters.isActive === true && (
              <Badge variant="outline">
                Active only
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleFilterChange('isActive', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {localFilters.hasFactors === true && (
              <Badge variant="outline">
                Has factors
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleFilterChange('hasFactors', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};