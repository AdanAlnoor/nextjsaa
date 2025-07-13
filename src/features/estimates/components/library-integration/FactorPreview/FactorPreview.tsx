'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Package, Users, Wrench, AlertCircle } from 'lucide-react';
import { FactorCalculatorService } from '@/features/estimates/services/factorCalculatorService';
import type { Database } from '@/shared/types/supabase-schema';
import type { FactorCalculationResult } from '@/features/estimates/types/factorCalculation';

type LibraryItem = Database['public']['Tables']['library_items']['Row'] & {
  assembly?: Database['public']['Tables']['assemblies']['Row'] & {
    section?: Database['public']['Tables']['sections']['Row'] & {
      division?: Database['public']['Tables']['divisions']['Row'];
    };
  };
};

interface FactorPreviewProps {
  items: LibraryItem[];
  projectId: string;
}

export const FactorPreview: React.FC<FactorPreviewProps> = ({ items, projectId }) => {
  const [calculations, setCalculations] = useState<Map<string, FactorCalculationResult>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length > 0) {
      calculateFactors();
    }
  }, [items, projectId]);

  const calculateFactors = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const factorService = FactorCalculatorService.getInstance();
      const newCalculations = new Map<string, FactorCalculationResult>();

      for (const item of items) {
        try {
          const calculation = await factorService.calculateItemCost(
            item.id,
            projectId,
            1 // Default quantity of 1 for preview
          );
          newCalculations.set(item.id, calculation);
        } catch (error) {
          console.error(`Error calculating factors for ${item.name}:`, error);
        }
      }

      setCalculations(newCalculations);
    } catch (error) {
      console.error('Error in factor calculations:', error);
      setError('Failed to calculate costs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalCost = Array.from(calculations.values()).reduce(
    (sum, calc) => sum + calc.totalCost,
    0
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Cost Breakdown Preview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Estimated Cost</div>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <div className="text-sm text-gray-500">per unit for {items.length} item{items.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Item Breakdown */}
          <div className="space-y-3">
            {items.map(item => {
              const calc = calculations.get(item.id);
              if (!calc) return null;

              const materialPercent = calc.totalCost > 0 ? (calc.materials.total / calc.totalCost) * 100 : 0;
              const labourPercent = calc.totalCost > 0 ? (calc.labour.total / calc.totalCost) * 100 : 0;
              const equipmentPercent = calc.totalCost > 0 ? (calc.equipment.total / calc.totalCost) * 100 : 0;

              return (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="font-medium text-sm mb-2">
                    <span className="text-gray-500">{calc.libraryItemCode}</span> - {calc.libraryItemName}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">Material:</span>
                        <span className="font-medium">${calc.materials.total.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">Labour:</span>
                        <span className="font-medium">${calc.labour.total.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wrench className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">Equipment:</span>
                        <span className="font-medium">${calc.equipment.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Cost Distribution Bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                      {materialPercent > 0 && (
                        <div 
                          className="bg-blue-500" 
                          style={{ width: `${materialPercent}%` }}
                          title={`Materials: ${materialPercent.toFixed(1)}%`}
                        />
                      )}
                      {labourPercent > 0 && (
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${labourPercent}%` }}
                          title={`Labour: ${labourPercent.toFixed(1)}%`}
                        />
                      )}
                      {equipmentPercent > 0 && (
                        <div 
                          className="bg-orange-500" 
                          style={{ width: `${equipmentPercent}%` }}
                          title={`Equipment: ${equipmentPercent.toFixed(1)}%`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Rate:</span>
                      <span className="text-sm font-bold">${calc.ratePerUnit.toFixed(2)}/{item.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Breakdown Tabs (for single item) */}
          {items.length === 1 && calculations.get(items[0].id) && (
            <Tabs defaultValue="materials" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="labour">Labour</TabsTrigger>
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
              </TabsList>
              
              <TabsContent value="materials" className="space-y-2 max-h-48 overflow-auto">
                {calculations.get(items[0].id)?.breakdown.materials.length === 0 ? (
                  <p className="text-sm text-gray-500">No materials required</p>
                ) : (
                  calculations.get(items[0].id)?.breakdown.materials.map((material, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 hover:bg-gray-50 rounded">
                      <span>{material.name}</span>
                      <span className="text-gray-600">
                        {material.quantity.toFixed(2)} {material.unit} @ ${material.rate.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="labour" className="space-y-2 max-h-48 overflow-auto">
                {calculations.get(items[0].id)?.breakdown.labour.length === 0 ? (
                  <p className="text-sm text-gray-500">No labour required</p>
                ) : (
                  calculations.get(items[0].id)?.breakdown.labour.map((labour, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 hover:bg-gray-50 rounded">
                      <span>{labour.name}</span>
                      <span className="text-gray-600">
                        {labour.hours.toFixed(2)} hrs @ ${labour.rate.toFixed(2)}/hr
                      </span>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="equipment" className="space-y-2 max-h-48 overflow-auto">
                {calculations.get(items[0].id)?.breakdown.equipment.length === 0 ? (
                  <p className="text-sm text-gray-500">No equipment required</p>
                ) : (
                  calculations.get(items[0].id)?.breakdown.equipment.map((equipment, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 hover:bg-gray-50 rounded">
                      <span>{equipment.name}</span>
                      <span className="text-gray-600">
                        {equipment.hours.toFixed(2)} hrs @ ${equipment.rate.toFixed(2)}/hr
                      </span>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
};