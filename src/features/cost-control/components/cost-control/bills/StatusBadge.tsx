import React from 'react';
import { cn } from '@/shared/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Determine badge color based on status
  const getStatusStyles = () => {
    switch (status) {
      // Bill statuses
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Partial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Draft':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      
      // Purchase Order statuses - Enhanced
      case 'Pending Review':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Pending Approval':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Revision Required':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Converted to Bill':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Partially Billed':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Fully Billed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span 
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusStyles(),
        className
      )}
      data-testid={`status-badge-${status.toLowerCase()}`}
    >
      {status}
    </span>
  );
} 