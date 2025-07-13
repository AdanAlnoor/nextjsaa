'use client'

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { FileText, Package, Users, Wrench } from 'lucide-react';
import { EstimateTab } from '../../bq/EstimateTab';
import { MaterialScheduleTab } from '../MaterialScheduleTab';
import { LabourScheduleTab } from '../LabourScheduleTab';
import { EquipmentScheduleTab } from '../EquipmentScheduleTab';
import type { Database } from '@/shared/types/supabase-schema';

type Project = Database['public']['Tables']['projects']['Row'];

interface EstimateTabsProps {
  project: Project;
}

export const EstimateTabs: React.FC<EstimateTabsProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState('bq');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBQUpdate = () => {
    // Trigger refresh of calculated tabs when BQ changes
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-4 mb-4">
        <TabsTrigger value="bq" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Bill of Quantities
        </TabsTrigger>
        <TabsTrigger value="materials" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Materials
        </TabsTrigger>
        <TabsTrigger value="labour" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Labour
        </TabsTrigger>
        <TabsTrigger value="equipment" className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Equipment
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="bq" className="h-full m-0">
          <EstimateTab project={project} onUpdate={handleBQUpdate} />
        </TabsContent>

        <TabsContent value="materials" className="h-full m-0 overflow-auto p-4">
          <MaterialScheduleTab 
            projectId={project.id} 
            refreshTrigger={refreshTrigger} 
          />
        </TabsContent>

        <TabsContent value="labour" className="h-full m-0 overflow-auto p-4">
          <LabourScheduleTab 
            projectId={project.id} 
            refreshTrigger={refreshTrigger} 
          />
        </TabsContent>

        <TabsContent value="equipment" className="h-full m-0 overflow-auto p-4">
          <EquipmentScheduleTab 
            projectId={project.id} 
            refreshTrigger={refreshTrigger} 
          />
        </TabsContent>
      </div>
    </Tabs>
  );
};