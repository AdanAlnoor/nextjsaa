'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { Clock, User, MessageSquare, AlertCircle } from 'lucide-react'
import { StatusHistoryEntry, STATUS_INFO } from '@/features/cost-control/types/purchaseOrder'
import { cn } from '@/shared/lib/utils'

interface StatusHistoryTrackerProps {
  purchaseOrderId: string
  className?: string
}

export function StatusHistoryTracker({ purchaseOrderId, className }: StatusHistoryTrackerProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  
  useEffect(() => {
    fetchStatusHistory()
  }, [purchaseOrderId])
  
  const fetchStatusHistory = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('purchase_order_status_history')
        .select(`
          *,
          user_name:changed_by(
            full_name,
            email
          )
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .order('changed_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      setHistory(data || [])
    } catch (error) {
      console.error('Error fetching status history:', error)
      setError('Failed to load status history')
    } finally {
      setIsLoading(false)
    }
  }
  
  const getStatusColor = (status: string) => {
    const statusInfo = STATUS_INFO[status]
    if (!statusInfo) return 'gray'
    return statusInfo.color
  }
  
  const getStatusIcon = (status: string) => {
    const statusInfo = STATUS_INFO[status]
    if (!statusInfo) return null
    
    // Return appropriate icon based on status category
    switch (statusInfo.category) {
      case 'draft':
        return <MessageSquare className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'approved':
        return <User className="h-4 w-4" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }
  
  const formatUserName = (entry: StatusHistoryEntry) => {
    if (entry.user_name) {
      const userData = entry.user_name as any
      return userData.full_name || userData.email || 'Unknown User'
    }
    return 'System'
  }
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <Clock className="h-5 w-5 mr-2" />
            No status changes recorded
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Status History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border"></div>
          
          {history.map((entry, index) => (
            <div key={entry.id} className="relative flex items-start space-x-4 pb-6 last:pb-0">
              {/* Timeline dot */}
              <div className={cn(
                "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background",
                `border-${getStatusColor(entry.to_status)}-200`
              )}>
                <div className={cn(
                  "rounded-full p-2",
                  `bg-${getStatusColor(entry.to_status)}-100 text-${getStatusColor(entry.to_status)}-600`
                )}>
                  {getStatusIcon(entry.to_status)}
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        `bg-${getStatusColor(entry.to_status)}-50 text-${getStatusColor(entry.to_status)}-700 border-${getStatusColor(entry.to_status)}-200`
                      )}
                    >
                      {entry.to_status}
                    </Badge>
                    {entry.from_status && (
                      <>
                        <span className="text-xs text-muted-foreground">from</span>
                        <Badge variant="outline" className="text-xs bg-gray-50">
                          {entry.from_status}
                        </Badge>
                      </>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                  </time>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-3 w-3 mr-1" />
                    {formatUserName(entry)}
                  </div>
                  
                  {entry.notes && (
                    <div className="text-sm text-foreground bg-muted/50 rounded-md p-3">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {entry.notes}
                    </div>
                  )}
                  
                  {entry.reason && entry.reason !== entry.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {entry.reason}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.changed_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <Separator />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Total status changes: {history.length}</span>
          <span>
            First created: {history.length > 0 
              ? formatDistanceToNow(new Date(history[history.length - 1].changed_at), { addSuffix: true })
              : 'Unknown'
            }
          </span>
        </div>
      </CardContent>
    </Card>
  )
}