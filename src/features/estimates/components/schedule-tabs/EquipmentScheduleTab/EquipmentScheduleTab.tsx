'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Download, Filter, RefreshCw, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ScheduleAggregationService } from '@/features/estimates/services/scheduleAggregationService';
import type { EquipmentScheduleItem } from '@/features/estimates/types/scheduleTypes';

interface EquipmentScheduleTabProps {
  projectId: string;
  refreshTrigger?: number;
}

export const EquipmentScheduleTab: React.FC<EquipmentScheduleTabProps> = ({ 
  projectId, 
  refreshTrigger 
}) => {
  const [equipment, setEquipment] = useState<EquipmentScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, [projectId, refreshTrigger]);

  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      const scheduleService = ScheduleAggregationService.getInstance();
      const data = await scheduleService.getEquipmentSchedule(projectId);
      setEquipment(data);
    } catch (error) {
      console.error('Error fetching equipment schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEquipment = categoryFilter === 'all' 
    ? equipment 
    : equipment.filter(e => e.equipmentType === categoryFilter);

  const categories = Array.from(new Set(equipment.map(e => e.equipmentType))).sort();

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      const scheduleService = ScheduleAggregationService.getInstance();
      const blob = await scheduleService.exportSchedule(projectId, format, 'equipment');
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipment-schedule-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting equipment schedule:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalHours = filteredEquipment.reduce((sum, e) => sum + e.totalHours, 0);
  const billableHours = filteredEquipment.reduce((sum, e) => sum + (e.totalHours * (e.utilizationFactor || 1)), 0);
  const totalCost = filteredEquipment.reduce((sum, e) => sum + e.totalCost, 0);
  const totalDays = Math.ceil(billableHours / 8);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Equipment Schedule</h3>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-orange-600 rounded-full"></div>
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
        <h3 className="text-lg font-semibold">Equipment Schedule</h3>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchEquipment()}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Base Hours</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                  <TableHead className="text-right">Bill. Hours</TableHead>
                  <TableHead className="text-right">Rate/Hr</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No equipment requirements found{categoryFilter !== 'all' ? ' for this category' : ''}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((equipment) => {
                    const billableHours = equipment.totalHours * (equipment.utilizationFactor || 1);
                    return (
                      <TableRow key={equipment.equipmentId}>
                        <TableCell className="font-mono text-sm">{equipment.equipmentCode}</TableCell>
                        <TableCell>{equipment.equipmentName}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs bg-orange-100 rounded">
                            {equipment.equipmentType}
                          </span>
                        </TableCell>
                        <TableCell>{equipment.equipmentCategory || '-'}</TableCell>
                        <TableCell className="text-right">{equipment.baseHours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {((equipment.utilizationFactor || 1) * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {billableHours.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">${equipment.hourlyRate.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${equipment.totalCost.toFixed(2)}
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
              <p className="text-sm text-gray-600">Total Equipment</p>
              <p className="text-2xl font-bold">{filteredEquipment.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billable Hours</p>
              <p className="text-2xl font-bold">{billableHours.toFixed(0)}</p>
              <p className="text-xs text-gray-500">({totalHours.toFixed(0)} base)</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Days</p>
              <p className="text-2xl font-bold">{totalDays}</p>
              <p className="text-xs text-gray-500">(8hr days)</p>
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