/**
 * RateHistoryDialog Component
 * Phase 1: Project-Specific Pricing Services
 * 
 * Displays historical rate changes for a project with detailed timeline,
 * change summaries, and the ability to view specific rate snapshots.
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  User,
  ChevronRight,
  History,
  AlertCircle
} from 'lucide-react';

import { ProjectRatesService } from '../../services/projectRatesService';
import { RateHistory } from '../../types/rates';

interface RateHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export const RateHistoryDialog: React.FC<RateHistoryDialogProps> = ({
  open,
  onOpenChange,
  projectId
}) => {
  const [history, setHistory] = useState<RateHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RateHistory | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');

  const projectRatesService = ProjectRatesService.getInstance();

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, projectId]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const historyData = await projectRatesService.getRateHistory(projectId, undefined, undefined, 50);
      setHistory(historyData);
      
      if (historyData.length > 0 && !selectedRecord) {
        setSelectedRecord(historyData[0]); // Select most recent
      }
    } catch (error) {
      console.error('Failed to load rate history:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, projectRatesService, selectedRecord]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getChangeTypeColor = (changeCount: number) => {
    if (changeCount === 0) return 'text-gray-500';
    if (changeCount < 5) return 'text-blue-600';
    if (changeCount < 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderTimelineView = () => (
    <div className="space-y-4">
      {history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Rate History</h3>
          <p>No rate changes have been recorded for this project yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record, index) => (
            <Card 
              key={record.id} 
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedRecord?.id === record.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedRecord(record)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDate(record.effectiveDate)}
                      </span>
                      {index === 0 && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Updated by user</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(record.createdAt)}</span>
                      </div>
                    </div>

                    {record.changesSummary && (
                      <div className="flex gap-4 text-sm">
                        {record.changesSummary.materialsChanged > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{record.changesSummary.materialsChanged} materials</span>
                          </div>
                        )}
                        {record.changesSummary.labourChanged > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{record.changesSummary.labourChanged} labour</span>
                          </div>
                        )}
                        {record.changesSummary.equipmentChanged > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>{record.changesSummary.equipmentChanged} equipment</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetailView = () => {
    if (!selectedRecord) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a history record to view details</p>
        </div>
      );
    }

    const { rates } = selectedRecord;
    const categories = [
      { key: 'materials', label: 'Materials', data: rates.materials, color: 'blue' },
      { key: 'labour', label: 'Labour', data: rates.labour, color: 'green' },
      { key: 'equipment', label: 'Equipment', data: rates.equipment, color: 'orange' }
    ] as const;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold">
            Rate Snapshot - {formatDate(selectedRecord.effectiveDate)}
          </h3>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(selectedRecord.createdAt)}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {categories.map(({ key, label, data, color }) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm text-${color}-600`}>
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(data).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  custom rates
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Rates */}
        <Tabs defaultValue="materials" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {categories.map(({ key, label, data }) => (
              <TabsTrigger key={key} value={key}>
                {label} ({Object.keys(data).length})
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(({ key, label, data }) => (
            <TabsContent key={key} value={key} className="mt-4">
              {Object.keys(data).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No {label.toLowerCase()} rates in this snapshot</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data).map(([itemCode, rate]) => (
                      <TableRow key={itemCode}>
                        <TableCell className="font-mono">
                          {itemCode}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${rate.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Rate History
          </DialogTitle>
          <DialogDescription>
            View historical rate changes and snapshots for this project
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Rate Details</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="timeline" className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  renderTimelineView()
                )}
              </TabsContent>

              <TabsContent value="details" className="h-full">
                {renderDetailView()}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {history.length > 0 && (
                <>
                  {history.length} history records found
                  {selectedRecord && (
                    <> • Viewing snapshot from {formatDate(selectedRecord.effectiveDate)}</>
                  )}
                </>
              )}
            </div>
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};