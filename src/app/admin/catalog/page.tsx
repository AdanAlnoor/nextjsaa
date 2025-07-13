'use client'

import { CatalogueManager } from '@/admin/components/admin/library/CatalogueManager'


export default function CatalogManagementPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 w-[90%] mx-auto py-2 overflow-hidden">
        <CatalogueManager />
      </div>
    </div>
  )
}