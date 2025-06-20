'use client'

import { useState, memo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database } from '@/types/supabase'
import { BillsTab } from './bills/BillsTab'
import { CostItemsTab } from './CostItemsTab'
import { WorkDoneTab } from './WorkDoneTab'
import { WagesTab } from './WagesTab'
import { PurchaseOrdersTab } from './purchase-orders/PurchaseOrdersTab'
import { SummaryTab } from './summary/SummaryTab'

// Import our new component - disabled for now until all components are ready
// import { PurchaseOrdersTab } from './purchase-orders/PurchaseOrdersTab'

type Project = Database['public']['Tables']['projects']['Row']

interface CostControlTabProps {
  project: Project
  authStatus?: 'authenticated' | 'unauthenticated' | 'loading'
}

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'bills', label: 'Bills' },
  { id: 'cost-items', label: 'Cost Items' },
  { id: 'purchase-orders', label: 'Purchase Orders' },
  { id: 'work-done', label: 'Work Done' },
  { id: 'wages', label: 'Wages' },
]

export const CostControlTab = memo(function CostControlTab({ project, authStatus = 'authenticated' }: CostControlTabProps) {
  const [activeTab, setActiveTab] = useState('summary')
  
  // If we're on the summary tab, let's just show the SummaryTab component directly
  // This prevents duplicate tab bars
  if (activeTab === 'summary') {
    return <SummaryTab project={project} />
  }
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <TabsList className="bg-background mb-4">
        {TABS.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      <TabsContent value="bills" className="flex-1 overflow-hidden">
        <BillsTab project={project} authStatus={authStatus} />
      </TabsContent>
      
      <TabsContent value="cost-items" className="flex-1 overflow-hidden">
        <CostItemsTab project={project} />
      </TabsContent>
      
      <TabsContent value="purchase-orders" className="flex-1 overflow-hidden">
        <PurchaseOrdersTab project={project} />
      </TabsContent>
      
      <TabsContent value="work-done" className="flex-1 overflow-hidden">
        <WorkDoneTab project={project} />
      </TabsContent>
      
      <TabsContent value="wages" className="flex-1 overflow-hidden">
        <WagesTab project={project} />
      </TabsContent>
    </Tabs>
  )
}) 