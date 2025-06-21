"use client";

import { useState, useMemo, memo } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Database } from '@/types/supabase';
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from '@/lib/utils';
import { EstimateItemWithChildren } from '@/types/estimate';
import { ExcelImport } from './ExcelImport';

type DatabaseEstimateItem = Database['public']['Tables']['estimate_items']['Row'];

interface EstimateItemProps {
  item: EstimateItemWithChildren;
  level: number;
  index: number;
  isLocked: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onAddChild: (parentId: string) => void;
  onImportExcel?: (parentId: string, items: Partial<EstimateItemWithChildren>[]) => void;
  visibleColumns: string[];
}

const EstimateItem = memo(({
  item,
  level,
  index,
  isLocked,
  isSelected,
  onSelect,
  onAddChild,
  onImportExcel,
  visibleColumns
}: EstimateItemProps) => {
  const builderCost = useMemo(() => {
    return (
      (item.material || 0) +
      (item.labour || 0) +
      (item.equipment || 0) +
      (item.overheads || 0) +
      (item.profit || 0)
    );
  }, [item]);

  return (
    <div className="estimate-row" style={{ paddingLeft: `${level * 24}px` }}>
      <div className="estimate-cell estimate-cell-fixed left-0 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          disabled={isLocked}
        />
      </div>
      
      <div className="estimate-cell estimate-cell-fixed left-12 w-64 flex items-center gap-2">
        {item.children && (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-6 w-6"
            onClick={() => {
              if (item.isExpanded !== undefined) {
                item.isExpanded = !item.isExpanded;
              }
            }}
          >
            {item.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        <span className="truncate">{item.name}</span>
      </div>

      {visibleColumns.includes('Quantity') && (
        <div className="estimate-cell flex-1 min-w-[150px]">{item.quantity || '-'}</div>
      )}
      {visibleColumns.includes('Unit') && (
        <div className="estimate-cell flex-1 min-w-[150px]">{item.unit || '-'}</div>
      )}
      {visibleColumns.includes('Rate') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.unit_cost ? formatCurrency(item.unit_cost) : '-'}
        </div>
      )}
      {visibleColumns.includes('Amount') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.amount ? formatCurrency(item.amount) : '-'}
        </div>
      )}
      {visibleColumns.includes('Material') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.material ? formatCurrency(item.material) : '-'}
        </div>
      )}
      {visibleColumns.includes('Labour') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.labour ? formatCurrency(item.labour) : '-'}
        </div>
      )}
      {visibleColumns.includes('Equipment') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.equipment ? formatCurrency(item.equipment) : '-'}
        </div>
      )}
      {visibleColumns.includes('Overheads') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.overheads ? formatCurrency(item.overheads) : '-'}
        </div>
      )}
      {visibleColumns.includes('Profit') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.profit ? formatCurrency(item.profit) : '-'}
        </div>
      )}
      {visibleColumns.includes('VAT') && (
        <div className="estimate-cell flex-1 min-w-[150px] text-right">
          {item.vat ? formatCurrency(item.vat) : '-'}
        </div>
      )}
      
      <div className="estimate-cell flex-none w-24 flex items-center gap-2">
        {!isLocked && level === 1 && onImportExcel && (
          <ExcelImport
            parentId={item.id}
            onImport={(items) => onImportExcel(item.id, items)}
          />
        )}
        {!isLocked && level < 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-6 w-6"
            onClick={() => onAddChild(item.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

EstimateItem.displayName = 'EstimateItem';

export default EstimateItem; 