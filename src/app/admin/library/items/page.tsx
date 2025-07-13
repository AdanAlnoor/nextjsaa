/**
 * Admin Library Items Management Page
 * Phase 2: Full library item lifecycle management interface
 */

import React from 'react';
import { LibraryItemManager } from '@/features/library/components/management/LibraryItemManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Package, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  BarChart3,
  History,
  Settings
} from 'lucide-react';

export default function LibraryItemsManagementPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Library Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your construction library items through their complete lifecycle
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Phase 2: Management System
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,156</div>
            <p className="text-xs text-muted-foreground">
              Ready for use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Library</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">668</div>
            <p className="text-xs text-muted-foreground">
              Production ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Library Items
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Library Items Management</CardTitle>
              <CardDescription>
                Create, edit, and manage library items through their complete lifecycle.
                Use the draft → confirmed → actual workflow to ensure quality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LibraryItemManager
                showBulkActions={true}
                showVersionHistory={true}
                allowQuickAdd={true}
                onItemCreate={(item) => {
                  console.log('Item created:', item);
                }}
                onItemUpdate={(item) => {
                  console.log('Item updated:', item);
                }}
                onItemDelete={(itemId) => {
                  console.log('Item deleted:', itemId);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Item Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of items by their current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm">Draft</span>
                    </div>
                    <div className="text-sm font-medium">23 (0.8%)</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">Confirmed</span>
                    </div>
                    <div className="text-sm font-medium">2,156 (75.7%)</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded"></div>
                      <span className="text-sm">Actual</span>
                    </div>
                    <div className="text-sm font-medium">668 (23.5%)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest changes to library items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">CONC-C30-01</span> confirmed
                    </div>
                    <div className="text-xs text-muted-foreground ml-auto">2h ago</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">STEEL-BEAM-IPE</span> created
                    </div>
                    <div className="text-xs text-muted-foreground ml-auto">4h ago</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">LAB-MASON-01</span> marked as actual
                    </div>
                    <div className="text-xs text-muted-foreground ml-auto">6h ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Division Breakdown</CardTitle>
              <CardDescription>
                Item count by construction division
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">892</div>
                  <div className="text-sm text-muted-foreground">03 - Concrete</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">643</div>
                  <div className="text-sm text-muted-foreground">05 - Metals</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">512</div>
                  <div className="text-sm text-muted-foreground">09 - Finishes</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">800</div>
                  <div className="text-sm text-muted-foreground">Other</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Complete history of all library item changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2" />
                <p>Audit trail functionality will be implemented in the next phase.</p>
                <p className="text-sm">This will show all create, update, delete, and status change operations.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Settings</CardTitle>
                <CardDescription>
                  Configure the library item lifecycle workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto-confirm items</div>
                      <div className="text-sm text-muted-foreground">
                        Automatically confirm items with complete factors
                      </div>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Version retention</div>
                      <div className="text-sm text-muted-foreground">
                        Number of versions to keep per item
                      </div>
                    </div>
                    <select className="border rounded px-2 py-1">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                      <option>Unlimited</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Manage who can perform library operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-2">Create Draft Items</div>
                    <div className="text-sm text-muted-foreground">All authenticated users</div>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Confirm Items</div>
                    <div className="text-sm text-muted-foreground">Library managers and admins</div>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Delete Items</div>
                    <div className="text-sm text-muted-foreground">Admins only</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}