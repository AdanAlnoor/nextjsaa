# LME (Labor, Materials, Equipment) Implementation Guide

## 🎯 What We're Building

We're adding a new feature called **LME Management** to your project management system. This will help track:
- **Materials**: Like cement, steel, bricks (with quantities)
- **Equipment**: Like cranes, bulldozers (with rental rates)  
- **Labor**: Like masons, electricians (with hourly rates)

All organized by project elements (like Foundation, Structure, etc.) with complete quantity tracking.

## 📋 Table of Contents

1. [Overview - The Big Picture](#overview)
2. [Phase 1: Database Setup](#phase-1-database-setup)
3. [Phase 2: Creating the Pages](#phase-2-creating-the-pages)
4. [Phase 3: Building Components](#phase-3-building-components)
5. [Phase 4: Connecting to Purchase Orders](#phase-4-connecting-to-purchase-orders)
6. [Phase 5: Adding Analytics](#phase-5-adding-analytics)
7. [Testing Everything](#testing-everything)
8. [Common Issues & Solutions](#common-issues-solutions)

---

## Overview

### Where LME Fits in Your System

```
Your App
├── Projects
│   └── [Project Name]
│       └── Cost Control
│           ├── Overview
│           ├── Purchase Orders
│           ├── Bills
│           └── LME (NEW!) ← We're adding this
│               ├── Materials
│               ├── Equipment
│               └── Labor
```

### Key Features We're Building

1. **Project-Specific Catalogs**: Each project has its own list of materials, equipment, and labor
2. **Quantity Tracking**: Know exactly how much cement you've ordered vs used
3. **Element Grouping**: See materials grouped by construction elements
4. **Price History**: Track how prices change over time
5. **Purchase Integration**: Create POs directly from LME items

---

## Phase 1: Database Setup

### What is a Database?
Think of it as Excel sheets that store your data permanently. We need to create tables (like sheets) to store LME information.

### Step 1.1: Create Migration File

Create a new file: `migrations/phase_4/001_create_lme_tables.sql`

```sql
-- This file creates the database tables for LME
-- Think of each table as an Excel sheet with specific columns

BEGIN;

-- Table 1: Project Materials (like your materials list)
CREATE TABLE project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  element_id UUID REFERENCES cost_control_items(id),
  catalog_item_id UUID REFERENCES catalog_items(id),
  
  -- Basic info
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL, -- bags, kg, m3, etc.
  group_name VARCHAR(100), -- for grouping similar items
  
  -- Pricing
  current_price DECIMAL(12,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Project Equipment
CREATE TABLE project_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  element_id UUID REFERENCES cost_control_items(id),
  
  -- Basic info
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100), -- excavator, crane, etc.
  group_name VARCHAR(100),
  
  -- Pricing (can have daily OR hourly rates)
  daily_rate DECIMAL(12,2),
  hourly_rate DECIMAL(12,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Project Labor
CREATE TABLE project_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  element_id UUID REFERENCES cost_control_items(id),
  
  -- Basic info
  category VARCHAR(100) NOT NULL, -- Mason, Electrician, etc.
  skill_level VARCHAR(50), -- Skilled, Semi-skilled, Helper
  group_name VARCHAR(100),
  
  -- Pricing
  hourly_rate DECIMAL(12,2),
  overtime_rate DECIMAL(12,2),
  daily_rate DECIMAL(12,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: Quantity Tracking (tracks all movements)
CREATE TABLE lme_quantity_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- What type and which item
  lme_type VARCHAR(20) NOT NULL CHECK (lme_type IN ('material', 'equipment', 'labor')),
  lme_item_id UUID NOT NULL,
  element_id UUID REFERENCES cost_control_items(id),
  
  -- Quantities (all can be decimal for partial units)
  quantity_ordered DECIMAL(12,3) DEFAULT 0,
  quantity_delivered DECIMAL(12,3) DEFAULT 0,
  quantity_used DECIMAL(12,3) DEFAULT 0,
  quantity_wasted DECIMAL(12,3) DEFAULT 0,
  quantity_returned DECIMAL(12,3) DEFAULT 0,
  
  -- Where this entry came from
  source_type VARCHAR(50), -- 'po', 'bill', 'manual', 'adjustment'
  source_id UUID, -- ID of the PO, Bill, etc.
  
  -- Additional info
  transaction_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: Price History (tracks price changes)
CREATE TABLE lme_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- What item
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('material', 'equipment', 'labor')),
  item_id UUID NOT NULL,
  
  -- Price info
  price DECIMAL(12,2) NOT NULL,
  effective_date DATE NOT NULL,
  
  -- Source of price
  source VARCHAR(100), -- 'po', 'manual', 'market'
  reference_id UUID, -- PO ID if from purchase order
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_project_materials_project ON project_materials(project_id);
CREATE INDEX idx_project_materials_element ON project_materials(element_id);
CREATE INDEX idx_project_equipment_project ON project_equipment(project_id);
CREATE INDEX idx_project_equipment_element ON project_equipment(element_id);
CREATE INDEX idx_project_labor_project ON project_labor(project_id);
CREATE INDEX idx_project_labor_element ON project_labor(element_id);
CREATE INDEX idx_quantity_tracking_project ON lme_quantity_tracking(project_id);
CREATE INDEX idx_quantity_tracking_item ON lme_quantity_tracking(lme_item_id, lme_type);
CREATE INDEX idx_price_history_item ON lme_price_history(item_id, item_type);

-- Create a view for easy quantity summaries
CREATE VIEW lme_quantity_summary AS
SELECT 
  project_id,
  lme_type,
  lme_item_id,
  element_id,
  SUM(quantity_ordered) as total_ordered,
  SUM(quantity_delivered) as total_delivered,
  SUM(quantity_used) as total_used,
  SUM(quantity_wasted) as total_wasted,
  SUM(quantity_returned) as total_returned,
  -- Calculate current stock
  (SUM(quantity_delivered) - SUM(quantity_used) - SUM(quantity_wasted) - SUM(quantity_returned)) as current_stock
FROM lme_quantity_tracking
GROUP BY project_id, lme_type, lme_item_id, element_id;

-- Add updated_at triggers
CREATE TRIGGER update_project_materials_updated_at 
  BEFORE UPDATE ON project_materials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_equipment_updated_at 
  BEFORE UPDATE ON project_equipment 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_labor_updated_at 
  BEFORE UPDATE ON project_labor 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'LME tables created successfully!';
  RAISE NOTICE 'Tables created: project_materials, project_equipment, project_labor, lme_quantity_tracking, lme_price_history';
  RAISE NOTICE 'View created: lme_quantity_summary';
END $$;
```

### Step 1.2: Update Purchase Order Items Table

Create file: `migrations/phase_4/002_update_po_items_for_lme.sql`

```sql
-- This adds LME tracking to purchase orders

BEGIN;

-- Add columns to track which LME item was used
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS lme_item_id UUID,
ADD COLUMN IF NOT EXISTS lme_item_type VARCHAR(20) CHECK (lme_item_type IN ('material', 'equipment', 'labor'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_po_items_lme ON purchase_order_items(lme_item_id, lme_item_type);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Purchase order items table updated for LME tracking!';
END $$;
```

### Step 1.3: Run the Migrations

1. Open your terminal
2. Navigate to your project folder
3. Run these commands:

```bash
# First migration
npm run db:migrate migrations/phase_4/001_create_lme_tables.sql

# Second migration  
npm run db:migrate migrations/phase_4/002_update_po_items_for_lme.sql
```

✅ **Phase 1 Complete!** Your database now has tables to store LME data.

---

## Phase 2: Creating the Pages

### Step 2.1: Create LME Main Page

Create file: `src/app/projects/[id]/cost-control/lme/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Wrench, Users, BarChart3, FileDown, FileUp } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { hasRole } from '@/utils/permissions'
import { useToast } from '@/components/ui/use-toast'

// Import our components (we'll create these next)
import { MaterialsTab } from '@/components/lme/MaterialsTab'
import { EquipmentTab } from '@/components/lme/EquipmentTab'
import { LaborTab } from '@/components/lme/LaborTab'
import { AnalyticsTab } from '@/components/lme/AnalyticsTab'

export default function LMEPage() {
  const params = useParams()
  const projectId = params.id as string
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('materials')

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const adminAccess = await hasRole('', 'admin', projectId)
        setIsAdmin(adminAccess)
        
        if (!adminAccess) {
          toast({
            title: "Access Denied",
            description: "Only administrators can access LME management",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error checking admin access:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccess()
  }, [projectId, toast])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access LME management.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">LME Management</h1>
          <p className="text-muted-foreground">
            Manage Labor, Materials, and Equipment for this project
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileUp className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="labor" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Labor
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="mt-6">
          <MaterialsTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <EquipmentTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="labor" className="mt-6">
          <LaborTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Step 2.2: Add LME to Cost Control Navigation

Update file: `src/components/cost-control/CostControlTabs.tsx`

Find the tabs section and add the LME tab:

```typescript
// Add this to the existing tabs
{isAdmin && (
  <TabsTrigger value="lme">
    <Package className="w-4 h-4 mr-2" />
    LME
  </TabsTrigger>
)}

// Add this to the tab contents
{isAdmin && (
  <TabsContent value="lme">
    <LMESection projectId={projectId} />
  </TabsContent>
)}
```

✅ **Phase 2 Complete!** The LME page structure is now in place.

---

## Phase 3: Building Components

### Step 3.1: Create Materials Tab Component

Create file: `src/components/lme/MaterialsTab.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, TrendingUp, Package, AlertTriangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { AddMaterialDialog } from './dialogs/AddMaterialDialog'
import { MaterialDetailsDialog } from './dialogs/MaterialDetailsDialog'
import { QuantitySummary } from './components/QuantitySummary'

interface Material {
  id: string
  code: string
  name: string
  description: string | null
  unit: string
  current_price: number
  element_id: string | null
  element_name?: string
  group_name: string | null
  // From quantity summary view
  total_ordered?: number
  total_delivered?: number
  total_used?: number
  current_stock?: number
}

export function MaterialsTab({ projectId }: { projectId: string }) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedElement, setSelectedElement] = useState<string>('all')
  const [elements, setElements] = useState<any[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const supabase = createClient()

  // Load materials and their quantities
  useEffect(() => {
    loadMaterials()
    loadElements()
  }, [projectId])

  const loadMaterials = async () => {
    try {
      setIsLoading(true)
      
      // Get materials with quantity summary
      const { data, error } = await supabase
        .from('project_materials')
        .select(`
          *,
          cost_control_items!element_id(
            id,
            name
          ),
          quantity_summary:lme_quantity_summary!inner(
            total_ordered,
            total_delivered,
            total_used,
            current_stock
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        
      if (error) throw error
      
      // Format the data
      const formattedMaterials = (data || []).map(item => ({
        ...item,
        element_name: item.cost_control_items?.name,
        total_ordered: item.quantity_summary?.[0]?.total_ordered || 0,
        total_delivered: item.quantity_summary?.[0]?.total_delivered || 0,
        total_used: item.quantity_summary?.[0]?.total_used || 0,
        current_stock: item.quantity_summary?.[0]?.current_stock || 0,
      }))
      
      setMaterials(formattedMaterials)
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadElements = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_control_items')
        .select('id, name')
        .eq('project_id', projectId)
        .eq('level', 2) // Assuming level 2 are elements
        .order('name')
        
      if (error) throw error
      setElements(data || [])
    } catch (error) {
      console.error('Error loading elements:', error)
    }
  }

  // Filter materials based on search and element
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = searchTerm === '' || 
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.code.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesElement = selectedElement === 'all' || 
      material.element_id === selectedElement
      
    return matchesSearch && matchesElement
  })

  // Calculate summary statistics
  const summaryStats = {
    totalMaterials: materials.length,
    totalValue: materials.reduce((sum, m) => sum + (m.current_price * (m.total_ordered || 0)), 0),
    inStockCount: materials.filter(m => (m.current_stock || 0) > 0).length,
    lowStockCount: materials.filter(m => (m.current_stock || 0) < 10 && (m.current_stock || 0) > 0).length,
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">Active items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Ordered to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.inStockCount}</div>
            <p className="text-xs text-muted-foreground">Items with stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{summaryStats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <Label htmlFor="element" className="sr-only">Filter by Element</Label>
              <Select value={selectedElement} onValueChange={setSelectedElement}>
                <SelectTrigger id="element">
                  <SelectValue placeholder="Filter by element" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Elements</SelectItem>
                  {elements.map(element => (
                    <SelectItem key={element.id} value={element.id}>
                      {element.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Element</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-center">Quantities</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No materials found. Add your first material to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-mono text-sm">{material.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{material.name}</div>
                        {material.description && (
                          <div className="text-sm text-muted-foreground">{material.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{material.element_name || '-'}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell>
                      <QuantitySummary
                        ordered={material.total_ordered || 0}
                        delivered={material.total_delivered || 0}
                        used={material.total_used || 0}
                        stock={material.current_stock || 0}
                        unit={material.unit}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(material.current_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(material.current_price * (material.total_ordered || 0))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMaterial(material)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showAddDialog && (
        <AddMaterialDialog
          projectId={projectId}
          elements={elements}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false)
            loadMaterials()
          }}
        />
      )}

      {selectedMaterial && (
        <MaterialDetailsDialog
          material={selectedMaterial}
          projectId={projectId}
          onClose={() => setSelectedMaterial(null)}
          onUpdate={loadMaterials}
        />
      )}
    </div>
  )
}
```

### Step 3.2: Create Quantity Summary Component

Create file: `src/components/lme/components/QuantitySummary.tsx`

```typescript
import { Progress } from '@/components/ui/progress'

interface QuantitySummaryProps {
  ordered: number
  delivered: number
  used: number
  stock: number
  unit: string
}

export function QuantitySummary({ ordered, delivered, used, stock, unit }: QuantitySummaryProps) {
  const utilizationRate = delivered > 0 ? (used / delivered * 100) : 0
  
  return (
    <div className="space-y-1 text-sm min-w-[200px]">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Ordered:</span>
        <span className="font-medium">{ordered} {unit}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Delivered:</span>
        <span className="font-medium">{delivered} {unit}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Used:</span>
        <span className="font-medium">{used} {unit}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Stock:</span>
        <span className={`font-medium ${stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
          {stock} {unit}
        </span>
      </div>
      <div className="pt-1">
        <Progress value={utilizationRate} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {utilizationRate.toFixed(0)}% utilized
        </p>
      </div>
    </div>
  )
}
```

---

## Phase 4: Connecting to Purchase Orders

### Step 4.1: Update Purchase Order Service

Update file: `src/services/purchaseOrderService.ts`

Add these functions to handle LME integration:

```typescript
// Add this function to get LME items for PO creation
export async function getLMEItemsForCostControl(
  projectId: string,
  costControlItemId: string
) {
  try {
    const supabase = createClient()
    
    // Get the cost control item to determine type
    const { data: costControl } = await supabase
      .from('cost_control_items')
      .select('name')
      .eq('id', costControlItemId)
      .single()
    
    if (!costControl) return []
    
    // Determine if this is material, equipment, or labor based on name
    const itemName = costControl.name.toLowerCase()
    
    if (itemName.includes('material') || itemName.includes('concrete') || itemName.includes('steel')) {
      // Get materials for this element
      const { data } = await supabase
        .from('project_materials')
        .select('*')
        .eq('project_id', projectId)
        .eq('element_id', costControlItemId)
        .eq('is_active', true)
      
      return (data || []).map(item => ({
        id: item.id,
        type: 'material',
        code: item.code,
        name: item.name,
        unit: item.unit,
        price: item.current_price,
        description: item.description
      }))
    } else if (itemName.includes('equipment') || itemName.includes('machinery')) {
      // Get equipment
      const { data } = await supabase
        .from('project_equipment')
        .select('*')
        .eq('project_id', projectId)
        .eq('element_id', costControlItemId)
        .eq('is_active', true)
      
      return (data || []).map(item => ({
        id: item.id,
        type: 'equipment',
        code: item.code,
        name: item.name,
        unit: 'day', // or hour based on your needs
        price: item.daily_rate,
        description: item.description
      }))
    } else if (itemName.includes('labor') || itemName.includes('labour') || itemName.includes('worker')) {
      // Get labor
      const { data } = await supabase
        .from('project_labor')
        .select('*')
        .eq('project_id', projectId)
        .eq('element_id', costControlItemId)
        .eq('is_active', true)
      
      return (data || []).map(item => ({
        id: item.id,
        type: 'labor',
        code: `${item.category}-${item.skill_level}`,
        name: `${item.category} (${item.skill_level})`,
        unit: 'hour',
        price: item.hourly_rate,
        description: `${item.category} - ${item.skill_level}`
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error getting LME items:', error)
    return []
  }
}

// Add this function to record quantity when PO is approved
export async function recordLMEQuantityFromPO(purchaseOrderId: string) {
  try {
    const supabase = createClient()
    
    // Get PO items
    const { data: poItems } = await supabase
      .from('purchase_order_items')
      .select(`
        *,
        purchase_orders!inner(project_id)
      `)
      .eq('purchase_order_id', purchaseOrderId)
    
    if (!poItems) return
    
    // Record quantity for each item
    for (const item of poItems) {
      if (item.lme_item_id && item.lme_item_type) {
        await supabase
          .from('lme_quantity_tracking')
          .insert({
            project_id: item.purchase_orders.project_id,
            lme_type: item.lme_item_type,
            lme_item_id: item.lme_item_id,
            element_id: item.cost_control_item_id,
            quantity_ordered: item.quantity,
            source_type: 'po',
            source_id: purchaseOrderId,
            transaction_date: new Date().toISOString()
          })
      }
    }
  } catch (error) {
    console.error('Error recording LME quantity:', error)
  }
}
```

### Step 4.2: Update Purchase Order Dialog

Update the Create Purchase Order Dialog to use LME items:

In `src/components/cost-control/purchase-orders/dialogs/CreatePurchaseOrderDialog.tsx`:

```typescript
// Add import
import { getLMEItemsForCostControl } from '@/services/purchaseOrderService'

// In the component, replace catalog suggestions with LME items
const [lmeItems, setLmeItems] = useState([])

// When cost control item is selected
const handleCostControlSelect = async (itemId: string) => {
  setCostControlItemId(itemId)
  
  // Get LME items instead of catalog
  const items = await getLMEItemsForCostControl(projectId, itemId)
  setLmeItems(items)
}

// In the item selection dropdown
<Select
  value={selectedLmeItem}
  onValueChange={(value) => {
    const item = lmeItems.find(i => i.id === value)
    if (item) {
      setFormData({
        ...formData,
        description: item.name,
        unit: item.unit,
        unit_cost: item.price,
        lme_item_id: item.id,
        lme_item_type: item.type
      })
    }
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Select from LME items" />
  </SelectTrigger>
  <SelectContent>
    {lmeItems.map(item => (
      <SelectItem key={item.id} value={item.id}>
        <div className="flex justify-between items-center w-full">
          <span>{item.code} - {item.name}</span>
          <span className="text-sm text-muted-foreground ml-2">
            {formatCurrency(item.price)}/{item.unit}
          </span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Phase 5: Adding Analytics

### Step 5.1: Create Analytics Tab

Create file: `src/components/lme/AnalyticsTab.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/utils/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function AnalyticsTab({ projectId }: { projectId: string }) {
  const [summaryByElement, setSummaryByElement] = useState([])
  const [topMaterials, setTopMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [projectId])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      
      // Get purchase summary by element
      const { data: elementData } = await supabase
        .from('purchase_order_items')
        .select(`
          amount,
          cost_control_items!inner(
            id,
            name
          )
        `)
        .eq('cost_control_items.project_id', projectId)
        .not('cost_control_items.id', 'is', null)
      
      // Group by element
      const elementSummary = elementData?.reduce((acc, item) => {
        const elementId = item.cost_control_items.id
        const elementName = item.cost_control_items.name
        
        if (!acc[elementId]) {
          acc[elementId] = {
            id: elementId,
            name: elementName,
            total: 0,
            count: 0
          }
        }
        
        acc[elementId].total += item.amount
        acc[elementId].count += 1
        
        return acc
      }, {})
      
      setSummaryByElement(Object.values(elementSummary || {}))
      
      // Get top materials by value
      const { data: materialData } = await supabase
        .from('lme_quantity_summary')
        .select(`
          *,
          project_materials!inner(
            name,
            current_price
          )
        `)
        .eq('project_id', projectId)
        .eq('lme_type', 'material')
        .order('total_ordered', { ascending: false })
        .limit(10)
      
      setTopMaterials(materialData || [])
      
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="by-element">
        <TabsList>
          <TabsTrigger value="by-element">By Element</TabsTrigger>
          <TabsTrigger value="top-items">Top Items</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="by-element" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchases by Element</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryByElement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-items" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Materials by Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topMaterials.map((item, index) => (
                  <div key={item.lme_item_id} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{item.project_materials.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.total_ordered} units ordered
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(item.project_materials.current_price * item.total_ordered)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @ {formatCurrency(item.project_materials.current_price)} per unit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Price trends and forecasting will be available in the next update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## Testing Everything

### Test Checklist

1. **Database Setup**
   - [ ] Run migrations successfully
   - [ ] Check tables exist in Supabase

2. **Access Control**
   - [ ] Only admins can see LME tab
   - [ ] Non-admins get "Access Denied"

3. **Materials Management**
   - [ ] Can add new materials
   - [ ] Can view material list
   - [ ] Quantities show correctly
   - [ ] Filter by element works

4. **Purchase Order Integration**
   - [ ] LME items appear in PO creation
   - [ ] Selected items save with PO
   - [ ] Quantities update when PO approved

5. **Analytics**
   - [ ] Charts display correctly
   - [ ] Data is accurate
   - [ ] Filters work properly

---

## Common Issues & Solutions

### Issue: LME tab not showing
**Solution**: Make sure you're logged in as an admin user

### Issue: No items showing in PO dropdown
**Solution**: 
1. Check that you've added items to LME first
2. Make sure items are assigned to the correct element

### Issue: Quantities not updating
**Solution**: Quantities only update when PO status changes to "approved"

### Issue: Database migration fails
**Solution**: 
1. Check your database connection
2. Make sure you have the right permissions
3. Run migrations one at a time

---

## Next Steps

1. **Import existing data**: Create import functionality for bulk data
2. **Add price history charts**: Visual price tracking over time
3. **Mobile optimization**: Make it work well on tablets
4. **Export reports**: Generate PDF/Excel reports
5. **Notifications**: Alert when stock is low

---

## Conclusion

You've now implemented a complete LME management system! This gives you:
- Project-specific material/equipment/labor tracking
- Quantity management with stock levels
- Integration with purchase orders
- Analytics and reporting

Remember: Start small, test each feature, and gradually add more functionality as needed.