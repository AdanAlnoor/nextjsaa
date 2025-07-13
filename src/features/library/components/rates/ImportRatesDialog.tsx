/**
 * ImportRatesDialog Component
 * Phase 1: Project-Specific Pricing Services
 * 
 * Provides interface for importing rates from other projects with preview,
 * conflict resolution, and category selection capabilities.
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table';
import { 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { createClient } from '@/shared/lib/supabase/client';
import { ProjectRatesService } from '../../services/projectRatesService';
import { ProjectRates, RateComparison } from '../../types/rates';

interface ImportRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    sourceProjectId: string,
    categories: Array<'materials' | 'labour' | 'equipment'>,
    conflictResolution: 'overwrite' | 'skip' | 'merge'
  ) => Promise<void>;
  currentProjectId: string;
}

interface Project {
  id: string;
  name: string;
  ratesSummary?: {
    materials: number;
    labour: number;
    equipment: number;
    total: number;
  };
}

export const ImportRatesDialog: React.FC<ImportRatesDialogProps> = ({
  open,
  onOpenChange,
  onImport,
  currentProjectId
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategories, setSelectedCategories] = useState({
    materials: true,
    labour: true,
    equipment: true
  });
  const [conflictResolution, setConflictResolution] = useState<'overwrite' | 'skip' | 'merge'>('overwrite');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [comparison, setComparison] = useState<RateComparison[]>([]);

  const supabase = createClient();
  const projectRatesService = ProjectRatesService.getInstance();

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load projects the user has access to
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id, 
          name,
          project_members!inner(user_id)
        `)
        .neq('id', currentProjectId)
        .eq('project_members.user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('name');

      if (error) throw error;

      // Enhance with rate summaries
      const enhancedProjects = await Promise.all(
        (projects || []).map(async (project) => {
          try {
            const stats = await projectRatesService.getRateStatistics(project.id);
            return {
              ...project,
              ratesSummary: {
                materials: stats.categoryBreakdown.materials,
                labour: stats.categoryBreakdown.labour,
                equipment: stats.categoryBreakdown.equipment,
                total: stats.totalRates
              }
            };
          } catch {
            return {
              ...project,
              ratesSummary: {
                materials: 0,
                labour: 0,
                equipment: 0,
                total: 0
              }
            };
          }
        })
      );

      setProjects(enhancedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, supabase, projectRatesService]);

  const handlePreview = useCallback(async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      const comparison = await projectRatesService.compareProjectRates(
        selectedProject,
        currentProjectId
      );
      
      // Filter by selected categories
      const categories = Object.keys(selectedCategories).filter(
        key => selectedCategories[key as keyof typeof selectedCategories]
      ) as Array<'materials' | 'labour' | 'equipment'>;
      
      const filteredComparison = comparison.filter(item => 
        categories.includes(item.category)
      );

      setComparison(filteredComparison);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      toast.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, currentProjectId, selectedCategories, projectRatesService]);

  const handleImport = useCallback(async () => {
    if (!selectedProject) return;

    const categories = Object.keys(selectedCategories).filter(
      key => selectedCategories[key as keyof typeof selectedCategories]
    ) as Array<'materials' | 'labour' | 'equipment'>;

    if (categories.length === 0) {
      toast.error('Please select at least one category to import');
      return;
    }

    setImporting(true);
    try {
      await onImport(selectedProject, categories, conflictResolution);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  }, [selectedProject, selectedCategories, conflictResolution, onImport, onOpenChange]);

  const resetForm = useCallback(() => {
    setSelectedProject('');
    setSelectedCategories({ materials: true, labour: true, equipment: true });
    setConflictResolution('overwrite');
    setShowPreview(false);
    setComparison([]);
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'update': return <ArrowRight className="w-4 h-4 text-blue-500" />;
      case 'remove': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'unchanged': return <CheckCircle className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'add': return 'New';
      case 'update': return 'Update';
      case 'remove': return 'Remove';
      case 'unchanged': return 'No Change';
      default: return action;
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const categoriesArray = Object.keys(selectedCategories).filter(
    key => selectedCategories[key as keyof typeof selectedCategories]
  );

  const previewSummary = {
    total: comparison.length,
    add: comparison.filter(c => c.action === 'add').length,
    update: comparison.filter(c => c.action === 'update').length,
    remove: comparison.filter(c => c.action === 'remove').length,
    unchanged: comparison.filter(c => c.action === 'unchanged').length
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Rates from Another Project
          </DialogTitle>
          <DialogDescription>
            Copy rates from a similar project to save time on rate management
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {!showPreview ? (
            <>
              {/* Project Selection */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="source-project" className="text-base font-medium">
                    Source Project
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select a project to copy rates from
                  </p>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger id="source-project">
                      <SelectValue placeholder="Select a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{project.name}</span>
                            {project.ratesSummary && project.ratesSummary.total > 0 && (
                              <Badge variant="outline" className="ml-2">
                                {project.ratesSummary.total} rates
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Summary */}
                {selectedProjectData?.ratesSummary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Source Project Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedProjectData.ratesSummary.materials}
                          </div>
                          <div className="text-muted-foreground">Materials</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedProjectData.ratesSummary.labour}
                          </div>
                          <div className="text-muted-foreground">Labour</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {selectedProjectData.ratesSummary.equipment}
                          </div>
                          <div className="text-muted-foreground">Equipment</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {selectedProjectData.ratesSummary.total}
                          </div>
                          <div className="text-muted-foreground">Total</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Categories to Import</Label>
                <div className="space-y-2">
                  {[
                    { key: 'materials', label: 'Materials', icon: '🧱', color: 'text-blue-600' },
                    { key: 'labour', label: 'Labour', icon: '👷', color: 'text-green-600' },
                    { key: 'equipment', label: 'Equipment', icon: '🚜', color: 'text-orange-600' }
                  ].map(({ key, label, icon, color }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={selectedCategories[key as keyof typeof selectedCategories]}
                        onCheckedChange={(checked) => 
                          setSelectedCategories(prev => ({
                            ...prev,
                            [key]: checked as boolean
                          }))
                        }
                      />
                      <Label htmlFor={key} className={`flex items-center gap-2 ${color}`}>
                        <span>{icon}</span>
                        <span>{label}</span>
                        {selectedProjectData?.ratesSummary && (
                          <Badge variant="outline">
                            {selectedProjectData.ratesSummary[key as keyof typeof selectedProjectData.ratesSummary]} rates
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conflict Resolution */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Conflict Resolution</Label>
                <p className="text-sm text-muted-foreground">
                  What should happen when an item code already exists in this project?
                </p>
                <RadioGroup value={conflictResolution} onValueChange={setConflictResolution as any}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overwrite" id="overwrite" />
                    <Label htmlFor="overwrite">
                      <strong>Overwrite</strong> - Replace existing rates with imported ones
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip">
                      <strong>Skip</strong> - Keep existing rates, ignore imports
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge">
                      <strong>Merge</strong> - Only import if rates are different
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Import Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Review changes before importing
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Back to Settings
                </Button>
              </div>

              {/* Preview Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{previewSummary.total}</div>
                      <div className="text-sm text-muted-foreground">Total Changes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{previewSummary.add}</div>
                      <div className="text-sm text-muted-foreground">New Rates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{previewSummary.update}</div>
                      <div className="text-sm text-muted-foreground">Updates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{previewSummary.remove}</div>
                      <div className="text-sm text-muted-foreground">Removed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-400">{previewSummary.unchanged}</div>
                      <div className="text-sm text-muted-foreground">Unchanged</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Changes */}
              {comparison.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rate Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="text-right">Current Rate</TableHead>
                          <TableHead className="text-right">New Rate</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.slice(0, 20).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{item.itemCode}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getActionIcon(item.action)}
                                <span>{getActionLabel(item.action)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${item.targetRate.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${item.sourceRate.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.difference !== 0 && (
                                <span className={item.difference > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {item.difference > 0 ? '+' : ''}${item.difference.toFixed(2)}
                                  ({item.percentageChange > 0 ? '+' : ''}{item.percentageChange.toFixed(1)}%)
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {comparison.length > 20 && (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        ... and {comparison.length - 20} more changes
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {!showPreview && selectedProject && categoriesArray.length > 0 && (
                <>Importing {categoriesArray.join(', ')} rates with {conflictResolution} resolution</>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              
              {!showPreview ? (
                <Button
                  onClick={handlePreview}
                  disabled={!selectedProject || categoriesArray.length === 0 || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Import
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={importing || previewSummary.total === 0}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {previewSummary.total} Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};