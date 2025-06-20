import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { trackEvent, AnalyticsEventTypes } from '@/utils/analytics';

interface BillsHeaderProps {
  onAddBill: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function BillsHeader({ onAddBill, onRefresh, isRefreshing }: BillsHeaderProps) {
  const handleAddBill = () => {
    trackEvent(AnalyticsEventTypes.INTERACTION, {
      action: 'add_bill_button_click',
      location: 'bills_header'
    });
    
    onAddBill();
  };
  
  const handleRefresh = () => {
    trackEvent(AnalyticsEventTypes.INTERACTION, {
      action: 'refresh_bills',
      location: 'bills_header'
    });
    
    onRefresh();
  };
  
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-gray-600"
          data-testid="refresh-button"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Button 
          onClick={handleAddBill}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="add-bill-button"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Bill
        </Button>
      </div>
    </div>
  );
} 