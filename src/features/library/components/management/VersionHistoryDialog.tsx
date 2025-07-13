/**
 * Phase 2: Version History Dialog
 * Dialog for viewing and managing version history of library items
 */

'use client';

import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { LibraryItemVersion, VersionHistoryDialogProps } from '../../types/library';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import { 
  RotateCcw, 
  Eye, 
  Calendar,
  User,
  FileText,
  History,
  AlertCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
  open,
  onOpenChange,
  itemId,
  onRestore
}) => {
  const [versions, setVersions] = useState<LibraryItemVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<LibraryItemVersion | null>(null);
  const [showVersionDetails, setShowVersionDetails] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    if (open && itemId) {
      loadVersions();
    }
  }, [open, itemId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await libraryService.getVersionHistory(itemId);
      setVersions(data);
    } catch (error: any) {
      toast.error('Failed to load version history');
      console.error('Load versions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Are you sure you want to restore to version ${versionNumber}? This will create a new version with the restored data.`)) {
      return;
    }

    setRestoringVersion(versionId);
    try {
      await libraryService.restoreFromVersion(itemId, versionId);
      toast.success(`Successfully restored to version ${versionNumber}`);
      onRestore?.(versionId);
      
      // Reload versions to show the new restore version
      await loadVersions();
    } catch (error: any) {
      toast.error('Failed to restore version');
      console.error('Restore version error:', error);
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleViewDetails = (version: LibraryItemVersion) => {
    setSelectedVersion(version);
    setShowVersionDetails(true);
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'confirmed': return 'default';
      case 'actual': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return '📝';
      case 'confirmed': return '✅';
      case 'actual': return '⭐';
      default: return '📦';
    }
  };

  const formatVersionChanges = (version: LibraryItemVersion, previousVersion?: LibraryItemVersion) => {
    if (!previousVersion) {
      return 'Initial version';
    }

    const changes: string[] = [];
    const current = version.data;
    const previous = previousVersion.data;

    // Check for key field changes
    if (current.name !== previous.name) {
      changes.push(`Name: "${previous.name}" → "${current.name}"`);
    }
    if (current.status !== previous.status) {
      changes.push(`Status: ${previous.status} → ${current.status}`);
    }
    if (current.unit !== previous.unit) {
      changes.push(`Unit: ${previous.unit} → ${current.unit}`);
    }
    if (current.description !== previous.description) {
      changes.push('Description updated');
    }
    if (current.specifications !== previous.specifications) {
      changes.push('Specifications updated');
    }
    if (current.wastagePercentage !== previous.wastagePercentage) {
      changes.push(`Wastage: ${previous.wastagePercentage}% → ${current.wastagePercentage}%`);
    }

    return changes.length > 0 ? changes.join(', ') : 'Minor updates';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Version History
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading version history...</div>
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <div className="text-muted-foreground">No version history available</div>
                <div className="text-sm text-muted-foreground">
                  Version history is created when items are modified
                </div>
              </div>
            ) : (
              <>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Restoring a version will create a new version with the restored data. 
                    The current version will be preserved in history.
                  </AlertDescription>
                </Alert>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version, index) => {
                      const isLatest = index === 0;
                      const previousVersion = versions[index + 1];
                      const versionData = version.data;

                      return (
                        <TableRow key={version.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">v{version.version_number}</span>
                              {isLatest && (
                                <Badge variant="outline" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(versionData.status)} className="gap-1">
                              <span>{getStatusIcon(versionData.status)}</span>
                              {versionData.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-xs">
                              <div className="font-medium">{versionData.name}</div>
                              <div className="text-muted-foreground truncate">
                                {formatVersionChanges(version, previousVersion)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(version.created_at), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-muted-foreground">
                                {format(new Date(version.created_at), 'HH:mm')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <User className="w-3 h-3" />
                              <span className="text-muted-foreground">
                                {version.created_by ? 'User' : 'System'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground max-w-xs truncate">
                              {version.change_note || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewDetails(version)}
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {!isLatest && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRestore(version.id, version.version_number)}
                                  disabled={restoringVersion === version.id}
                                  title="Restore this version"
                                >
                                  {restoringVersion === version.id ? (
                                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-b-transparent" />
                                  ) : (
                                    <RotateCcw className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Details Modal */}
      {selectedVersion && (
        <Dialog open={showVersionDetails} onOpenChange={setShowVersionDetails}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Version {selectedVersion.version_number} Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              <div className="space-y-4">
                {/* Version Metadata */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">Version</div>
                    <div>v{selectedVersion.version_number}</div>
                  </div>
                  <div>
                    <div className="font-medium">Created</div>
                    <div>{format(new Date(selectedVersion.created_at), 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                  <div>
                    <div className="font-medium">Status</div>
                    <Badge variant={getStatusBadgeVariant(selectedVersion.data.status)}>
                      {selectedVersion.data.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium">Change Note</div>
                    <div className="text-muted-foreground">
                      {selectedVersion.change_note || 'No notes provided'}
                    </div>
                  </div>
                </div>

                {/* Version Data */}
                <div>
                  <h4 className="font-medium mb-2">Item Data at This Version</h4>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <pre className="text-sm overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedVersion.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};