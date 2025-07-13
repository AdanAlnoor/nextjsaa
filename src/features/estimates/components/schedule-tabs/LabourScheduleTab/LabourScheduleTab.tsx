'use client'

'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Download, Filter, RefreshCw, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useSchedules } from '@/features/estimates/hooks';

interface LabourScheduleTabProps {
  projectId: string;
  refreshTrigger?: number;
}

export const LabourScheduleTab: React.FC<LabourScheduleTabProps> = ({ 
  projectId, 
  refreshTrigger 
}) => {
  const { labour, isLoading, exportSchedule } = useSchedules(projectId, refreshTrigger);
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const filteredLabour = tradeFilter === 'all' 
    ? labour 
    : labour.filter(l => l.tradeType === tradeFilter);

  const trades = Array.from(new Set(labour.map(l => l.tradeType))).sort();

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      const scheduleService = ScheduleAggregationService.getInstance();
      const blob = await scheduleService.exportSchedule(projectId, format, 'labour');
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labour-schedule-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting labour schedule:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalHours = filteredLabour.reduce((sum, l) => sum + l.totalHours, 0);
  const adjustedHours = filteredLabour.reduce((sum, l) => sum + (l.totalHours / (l.productivityFactor || 1)), 0);
  const totalCost = filteredLabour.reduce((sum, l) => sum + l.totalCost, 0);
  const totalWorkers = filteredLabour.reduce((sum, l) => sum + (l.crewSize || 1), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Labour Schedule</h3>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-green-600 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Labour Schedule</h3>
        <div className="flex gap-2">
          <Select value={tradeFilter} onValueChange={setTradeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by trade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              {trades.map(trade => (
                <SelectItem key={trade} value={trade}>{trade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchLabour()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <div className="relative group">
            <Button 
              variant="outline"
              size="sm"
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <div className="absolute right-0 mt-1 w-32 bg-white border rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleExport('csv')}
              >
                Export CSV
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleExport('excel')}
              >
                Export Excel
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleExport('pdf')}
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Skill Level</TableHead>
                  <TableHead className="text-right">Base Hours</TableHead>
                  <TableHead className="text-right">Productivity</TableHead>
                  <TableHead className="text-right">Adj. Hours</TableHead>
                  <TableHead className="text-right">Crew Size</TableHead>
                  <TableHead className="text-right">Rate/Hr</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabour.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                      No labour requirements found{tradeFilter !== 'all' ? ' for this trade' : ''}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLabour.map((labour) => {
                    const adjustedHours = labour.totalHours / (labour.productivityFactor || 1);
                    return (
                      <TableRow key={labour.labourId}>
                        <TableCell className="font-mono text-sm">{labour.labourCode}</TableCell>
                        <TableCell>{labour.labourName}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs bg-green-100 rounded">
                            {labour.tradeType}
                          </span>
                        </TableCell>
                        <TableCell>{labour.skillLevel || '-'}</TableCell>
                        <TableCell className="text-right">{labour.baseHours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {((labour.productivityFactor || 1) * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {adjustedHours.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Users className="h-3 w-3 text-gray-400" />
                            {labour.crewSize}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">${labour.hourlyRate.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${labour.totalCost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Trades</p>
              <p className="text-2xl font-bold">{filteredLabour.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold">{adjustedHours.toFixed(0)}</p>
              <p className="text-xs text-gray-500">({totalHours.toFixed(0)} base)</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold">{totalWorkers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};