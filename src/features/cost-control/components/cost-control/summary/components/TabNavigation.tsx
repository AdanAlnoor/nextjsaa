'use client'

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

interface Tab {
  id: string
  label: string
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (value: string) => void
}

export function TabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange 
}: TabNavigationProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="bg-slate-50/50 border-slate-200/50 mb-0 h-9 p-1">
        {tabs.map(tab => (
          <TabsTrigger 
            key={tab.id} 
            value={tab.id}
            className="text-sm font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
} 