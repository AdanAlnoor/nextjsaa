'use client'

import { CatalogueManager } from '@/components/admin/library/CatalogueManager'


export default function CatalogManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Catalogue Management</h1>
          <p className="text-gray-600 mt-2">
            Manage standardized, price-free foundation catalogues for Materials, Labor, and Equipment
          </p>
        </div>
        <CatalogueManager />
      </div>
    </div>
  )
}