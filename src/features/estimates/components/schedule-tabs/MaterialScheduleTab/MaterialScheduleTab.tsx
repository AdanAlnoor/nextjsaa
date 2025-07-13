'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Download, Filter, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useSchedules } from '@/features/estimates/hooks';

interface MaterialScheduleTabProps {
  projectId: string;
  refreshTrigger?: number;
}

export const MaterialScheduleTab: React.FC<MaterialScheduleTabProps> = ({ 
  projectId, 
  refreshTrigger 
}) => {
  const { materials, isLoading, exportSchedule } = useSchedules(projectId, refreshTrigger);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const filteredMaterials = categoryFilter === 'all' 
    ? materials 
    : materials.filter(m => m.materialCategory === categoryFilter);

  const categories = Array.from(new Set(materials.map(m => m.material_category))).sort();

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      const blob = await exportSchedule(format, 'material');
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `material-schedule-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting material schedule:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalCost = filteredMaterials.reduce((sum, m) => sum + m.total_amount_market, 0);
  const totalQuantity = filteredMaterials.reduce((sum, m) => sum + m.total_quantity_with_wastage, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Material Schedule</h3>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
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
        <h3 className="text-lg font-semibold">Material Schedule</h3>
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
            onClick={() => window.location.reload()}
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
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Base Qty</TableHead>
                  <TableHead className="text-right">Wastage %</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No materials found{categoryFilter !== 'all' ? ' for this category' : ''}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => (
                    <TableRow key={material.material_id}>
                      <TableCell className="font-mono text-sm">{material.material_code}</TableCell>
                      <TableCell>{material.material_name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                          {material.material_category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{material.base_quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{material.wastage_factor.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {material.total_quantity_with_wastage.toFixed(2)}
                      </TableCell>
                      <TableCell>{material.material_unit}</TableCell>
                      <TableCell className="text-right">${material.unit_rate_market.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${material.total_amount_market.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold">{filteredMaterials.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold">{totalQuantity.toFixed(0)}</p>
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