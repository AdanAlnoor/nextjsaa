'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { 
  Clock, 
  Eye,
  Edit,
  Download,
  RefreshCw,
  Calendar,
  User
} from 'lucide-react'

import type { LibraryItemUsage, LibraryItem } from '@/library/types/library'

export function RecentItems() {
  const [recentUsage, setRecentUsage] = useState<LibraryItemUsage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentItems()
  }, [])

  const loadRecentItems = async () => {
    setLoading(true)
    try {
      // Note: This would need an API endpoint to fetch recent usage
      // For now, we'll show a placeholder
      setRecentUsage([])
    } catch (error) {
      console.error('Failed to load recent items:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUsageIcon = (usageType: string) => {
    switch (usageType) {
      case 'view':
        return <Eye className="w-4 h-4 text-blue-500" />
      case 'edit':
        return <Edit className="w-4 h-4 text-green-500" />
      case 'export':
        return <Download className="w-4 h-4 text-purple-500" />
      case 'confirm':
        return <Clock className="w-4 h-4 text-orange-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getUsageBadge = (usageType: string) => {
    const colors = {
      view: 'bg-blue-100 text-blue-700',
      edit: 'bg-green-100 text-green-700',
      export: 'bg-purple-100 text-purple-700',
      confirm: 'bg-orange-100 text-orange-700',
      estimate: 'bg-indigo-100 text-indigo-700'
    }

    return (
      <Badge className={colors[usageType as keyof typeof colors] || 'bg-gray-100 text-gray-700'}>
        {getUsageIcon(usageType)}
        <span className="ml-1 capitalize">{usageType}</span>
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes} minutes ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading recent activity...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recent Items</h2>
          <p className="text-gray-600">Recently viewed, edited, and used library items</p>
        </div>
        <Button variant="outline" onClick={loadRecentItems}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Edits</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Items modified
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Items confirmed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Export Usage</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Times exported
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Track recent interactions with library items across all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsage.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsage.map((usage) => (
                  <TableRow key={usage.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">Item Code</p>
                        <p className="text-sm text-gray-600">Item Name</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getUsageBadge(usage.usageType)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{usage.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {usage.projectId ? (
                        <Badge variant="outline" size="sm">
                          Project
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDateTime(usage.usageDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {usage.metadata ? JSON.stringify(usage.metadata) : 'No details'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
              <p className="text-gray-600 mb-4">
                Library item usage will appear here once you start working with items.
              </p>
              <p className="text-sm text-gray-500">
                Recent activity includes viewing, editing, confirming, and exporting library items.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts for library management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Eye className="w-6 h-6" />
              <span className="text-sm">Browse Items</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Edit className="w-6 h-6" />
              <span className="text-sm">Draft Items</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Clock className="w-6 h-6" />
              <span className="text-sm">Pending Review</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Download className="w-6 h-6" />
              <span className="text-sm">Export Library</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}