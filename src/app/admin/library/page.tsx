'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export default function LibrarySystemPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Library Management
        </h1>
        <p className="text-muted-foreground">
          Manage estimation libraries and catalogues
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Materials Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">1,234</div>
                <p className="text-xs text-muted-foreground">
                  Available materials
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Labor Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">456</div>
                <p className="text-xs text-muted-foreground">
                  Available labor items
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Equipment Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">789</div>
                <p className="text-xs text-muted-foreground">
                  Available equipment
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Library Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Full library management system coming soon...
                </p>
                <div className="space-x-2">
                  <Button variant="outline" disabled>
                    Import Library
                  </Button>
                  <Button disabled>
                    Create New Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Materials Library</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Materials management functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="labor">
          <Card>
            <CardHeader>
              <CardTitle>Labor Library</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Labor management functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Library</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Equipment management functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}