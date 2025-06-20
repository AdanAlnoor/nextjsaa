import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function BillsTableSkeleton() {
  // Generate multiple rows for the table
  const rows = Array.from({ length: 5 }, (_, i) => (
    <div key={i} className="flex flex-col space-y-3 p-4 border-b last:border-b-0">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  ));

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div>{rows}</div>
    </div>
  );
}

export function BillDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-2 space-y-6">
          {/* General info card */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="p-4 bg-gray-50 border-b">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Items card */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="p-4 bg-gray-50 border-b">
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex justify-between border-b pb-3 last:border-0">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* Summary card */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="p-4 bg-gray-50 border-b">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment history card */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="p-4 bg-gray-50 border-b">
              <Skeleton className="h-6 w-36" />
            </div>
            <div className="p-4 space-y-4">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="space-y-2 border-b pb-3 last:border-0">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 