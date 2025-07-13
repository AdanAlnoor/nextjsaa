/**
 * ProjectRatesManager Component
 * Phase 1: Project-Specific Pricing Services
 * 
 * Main interface for managing custom material, labour, and equipment rates
 * per project. Provides tabbed interface with edit capabilities, history tracking,
 * and bulk import functionality.
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Calendar, Upload, History, Settings, TrendingUp, AlertCircle } from 'lucide-react';

import { ProjectRatesService } from '../../services/projectRatesService';
import { ProjectRates, RateStatistics } from '../../types/rates';
import { RatesList } from './RatesList';
import { RateHistoryDialog } from './RateHistoryDialog';
import { ImportRatesDialog } from './ImportRatesDialog';

interface ProjectRatesManagerProps {
  projectId: string;
  projectName?: string;
  onRatesUpdate?: () => void;
  readOnly?: boolean;
}

export const ProjectRatesManager: React.FC<ProjectRatesManagerProps> = ({ 
  projectId,
  projectName,
  onRatesUpdate,
  readOnly = false
}) => {
  const [rates, setRates] = useState<ProjectRates | null>(null);
  const [statistics, setStatistics] = useState<RateStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');

  const projectRatesService = ProjectRatesService.getInstance();

  useEffect(() => {
    loadRates();
  }, [projectId]);

  const loadRates = useCallback(async () => {
    try {
      setLoading(true);
      const [currentRates, stats] = await Promise.all([
        projectRatesService.getCurrentRates(projectId),
        projectRatesService.getRateStatistics(projectId)
      ]);
      
      setRates(currentRates);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load rates:', error);
      toast.error('Failed to load project rates');
    } finally {
      setLoading(false);
    }
  }, [projectId, projectRatesService]);

  const handleRateUpdate = useCallback(async (
    category: 'materials' | 'labour' | 'equipment',
    itemCode: string,
    newRate: number,
    reason?: string
  ) => {
    try {
      await projectRatesService.updateRateOverride(
        projectId, 
        category, 
        itemCode, 
        newRate,
        reason
      );
      
      toast.success('Rate updated successfully');
      await loadRates();
      onRatesUpdate?.();
    } catch (error) {
      toast.error('Failed to update rate');
      console.error('Rate update error:', error);
    }
  }, [projectId, projectRatesService, loadRates, onRatesUpdate]);

  const handleImport = useCallback(async (
    sourceProjectId: string,
    categories: Array<'materials' | 'labour' | 'equipment'>,
    conflictResolution: 'overwrite' | 'skip' | 'merge'
  ) => {
    try {
      const result = await projectRatesService.importRatesFromProject({
        sourceProjectId,
        targetProjectId: projectId,
        categories,
        conflictResolution
      });
      
      toast.success(`Imported ${result.imported} rates successfully`);
      
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Import warnings:', result.warnings);
      }
      
      await loadRates();
      onRatesUpdate?.();
    } catch (error) {
      toast.error('Failed to import rates');
      console.error('Import error:', error);
    }
  }, [projectId, projectRatesService, loadRates, onRatesUpdate]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'materials': return 'text-blue-600';
      case 'labour': return 'text-green-600';
      case 'equipment': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'materials': return '🧱';
      case 'labour': return '👷';
      case 'equipment': return '🚜';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Project Rates</h2>
            {projectName && (
              <Badge variant="outline" className="text-sm">
                {projectName}
              </Badge>
            )}
          </div>
          
          {rates?.effectiveDate && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Effective from: {new Date(rates.effectiveDate).toLocaleDateString()}
            </p>
          )}
        </div>
        
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-4 h-4 mr-1" />
              Import
            </Button>
            
            <Button
              onClick={() => setEditMode(!editMode)}
              variant={editMode ? 'secondary' : 'default'}
              size="sm"
            >
              <Settings className="w-4 h-4 mr-1" />
              {editMode ? 'View Mode' : 'Edit Rates'}
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Custom Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{statistics.totalRates}</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {(['materials', 'labour', 'equipment'] as const).map(category => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${getCategoryColor(category)}`}>
                  {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {statistics.categoryBreakdown[category]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg: ${statistics.averageRates[category].toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Rates Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Management</CardTitle>
          <CardDescription>
            Manage custom rates for materials, labour, and equipment. 
            These rates will override catalog rates for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="materials" className="flex items-center gap-2">
                🧱 Materials 
                <Badge variant="secondary" className="ml-1">
                  {Object.keys(rates?.materials || {}).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="labour" className="flex items-center gap-2">
                👷 Labour
                <Badge variant="secondary" className="ml-1">
                  {Object.keys(rates?.labour || {}).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="equipment" className="flex items-center gap-2">
                🚜 Equipment
                <Badge variant="secondary" className="ml-1">
                  {Object.keys(rates?.equipment || {}).length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="materials" className="mt-6">
              <RatesList
                rates={rates?.materials || {}}
                category="materials"
                editMode={editMode && !readOnly}
                onUpdate={handleRateUpdate}
                projectId={projectId}
              />
            </TabsContent>

            <TabsContent value="labour" className="mt-6">
              <RatesList
                rates={rates?.labour || {}}
                category="labour"
                editMode={editMode && !readOnly}
                onUpdate={handleRateUpdate}
                projectId={projectId}
              />
            </TabsContent>

            <TabsContent value="equipment" className="mt-6">
              <RatesList
                rates={rates?.equipment || {}}
                category="equipment"
                editMode={editMode && !readOnly}
                onUpdate={handleRateUpdate}
                projectId={projectId}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Empty State */}
      {statistics?.totalRates === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Custom Rates Set</h3>
              <p className="text-muted-foreground mb-4">
                This project is using catalog rates. Set custom rates to override default pricing.
              </p>
              {!readOnly && (
                <div className="flex justify-center gap-2">
                  <Button onClick={() => setEditMode(true)}>
                    Start Adding Rates
                  </Button>
                  <Button variant="outline" onClick={() => setShowImport(true)}>
                    Import from Another Project
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <RateHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        projectId={projectId}
      />

      <ImportRatesDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={handleImport}
        currentProjectId={projectId}
      />
    </div>
  );
};