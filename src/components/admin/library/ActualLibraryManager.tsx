'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Plus,
  Archive,
  Download,
  RefreshCw,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info,
  Package
} from 'lucide-react'

import type { ActualLibrarySnapshot, CreateActualLibrarySnapshotRequest } from '@/types/library'

export function ActualLibraryManager() {
  const [snapshots, setSnapshots] = useState<ActualLibrarySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Create snapshot form state
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDescription, setSnapshotDescription] = useState('')
  const [snapshotVersion, setSnapshotVersion] = useState('')

  useEffect(() => {
    loadSnapshots()
  }, [])

  const loadSnapshots = async () => {
    setLoading(true)
    try {
      // Note: This would need an API endpoint to fetch snapshots
      // For now, we'll show a placeholder
      setSnapshots([])
    } catch (error) {
      console.error('Failed to load snapshots:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSnapshot = async () => {
    if (!snapshotName.trim() || !snapshotVersion.trim()) {
      alert('Please provide name and version')
      return
    }

    setCreating(true)
    try {
      // Note: This would call the actual API endpoint
      const request: CreateActualLibrarySnapshotRequest = {
        name: snapshotName,
        description: snapshotDescription || undefined,
        version: snapshotVersion
      }

      // Mock successful creation
      setShowCreateDialog(false)
      setSnapshotName('')
      setSnapshotDescription('')
      setSnapshotVersion('')
      
      // Refresh snapshots
      await loadSnapshots()
    } catch (error) {
      console.error('Failed to create snapshot:', error)
      alert('Failed to create snapshot')
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading production library...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Library Management</h2>
          <p className="text-gray-600">Manage confirmed library snapshots ready for production use</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSnapshots}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Snapshot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Production Library Snapshot</DialogTitle>
                <DialogDescription>
                  Create a snapshot of all confirmed library items for production use
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    This will include all confirmed library items and mark them as "actual" status.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="snapshot-name">Snapshot Name *</Label>
                  <Input
                    id="snapshot-name"
                    placeholder="e.g., Production Library v2.1"
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="snapshot-version">Version *</Label>
                  <Input
                    id="snapshot-version"
                    placeholder="e.g., 2.1.0"
                    value={snapshotVersion}
                    onChange={(e) => setSnapshotVersion(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="snapshot-description">Description</Label>
                  <Textarea
                    id="snapshot-description"
                    placeholder="Describe what's included in this snapshot..."
                    value={snapshotDescription}
                    onChange={(e) => setSnapshotDescription(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createSnapshot}
                    disabled={creating || !snapshotName.trim() || !snapshotVersion.trim()}
                  >
                    {creating ? 'Creating...' : 'Create Snapshot'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Snapshots</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshots.length}</div>
            <p className="text-xs text-muted-foreground">
              Available versions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Snapshot</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {snapshots.find(s => s.isActive)?.version || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current production version
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Items</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Ready for snapshot
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Items</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              In current snapshot
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Information Alert */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Production Library Workflow:</strong> Only confirmed library items can be included in production snapshots. 
          Once a snapshot is created, items are marked as "actual" status and become available for estimates and project use.
        </AlertDescription>
      </Alert>

      {/* Snapshots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Library Snapshots</CardTitle>
          <CardDescription>
            Version history of production-ready library snapshots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{snapshot.name}</p>
                        <p className="text-sm text-gray-600">{snapshot.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{snapshot.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{snapshot.totalItems}</Badge>
                    </TableCell>
                    <TableCell>
                      {snapshot.isActive ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDate(snapshot.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{snapshot.createdBy}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        {!snapshot.isActive && (
                          <Button variant="ghost" size="sm">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Production Snapshots</h3>
              <p className="text-gray-600 mb-4">
                Create your first production library snapshot to make confirmed items available for estimates.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Snapshot
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Production Library Workflow</CardTitle>
          <CardDescription>
            Understanding the library item lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-gray-600 font-medium">1</span>
              </div>
              <h4 className="font-medium mb-1">Draft</h4>
              <p className="text-sm text-gray-600">Items being configured with factors</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-yellow-600 font-medium">2</span>
              </div>
              <h4 className="font-medium mb-1">Complete</h4>
              <p className="text-sm text-gray-600">Ready for review and confirmation</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-medium">3</span>
              </div>
              <h4 className="font-medium mb-1">Confirmed</h4>
              <p className="text-sm text-gray-600">Validated and ready for production</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 font-medium">4</span>
              </div>
              <h4 className="font-medium mb-1">Production</h4>
              <p className="text-sm text-gray-600">Available for estimates and projects</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}