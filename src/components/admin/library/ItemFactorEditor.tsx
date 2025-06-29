'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw
} from 'lucide-react'

import type { 
  LibraryItem, 
  ItemFactorEditorProps
} from '@/types/library'
import { UnifiedFactorManager } from './UnifiedFactorManager'

export function ItemFactorEditor({ item, onBack, readonly = false }: ItemFactorEditorProps) {
  const [currentItem, setCurrentItem] = useState<LibraryItem>(item)
  const [saving, setSaving] = useState(false)

  // Refresh item data
  useEffect(() => {
    setCurrentItem(item)
  }, [item])

  const refreshItem = async () => {
    try {
      const response = await fetch(`/api/admin/library/items/${currentItem.id}`)
      if (response.ok) {
        const updatedItem = await response.json()
        setCurrentItem(updatedItem)
      }
    } catch (error) {
      console.error('Failed to refresh item:', error)
    }
  }

  const getStatusAlert = () => {
    const totalFactors = currentItem.materials.length + currentItem.labor.length + currentItem.equipment.length

    if (totalFactors === 0) {
      return (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            This item has no factors yet. Add Materials, Labor, and/or Equipment as needed.
          </AlertDescription>
        </Alert>
      )
    } else if (currentItem.status === 'draft' && totalFactors > 0) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Item has {totalFactors} factor(s) added. Review all factors carefully, then click 'Mark as Complete' to proceed.
          </AlertDescription>
        </Alert>
      )
    } else if (currentItem.status === 'complete') {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Item marked as complete with {totalFactors} factor(s). Final review - click 'Accept & Confirm' to finalize.
          </AlertDescription>
        </Alert>
      )
    } else if (currentItem.status === 'confirmed') {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✅ This item has been confirmed by {currentItem.confirmedBy} on {new Date(currentItem.confirmedAt!).toLocaleDateString()}.
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  const handleAcceptItem = async () => {
    setSaving(true)
    try {
      // Check prerequisites before confirming
      const totalFactors = currentItem.materials.length + currentItem.labor.length + currentItem.equipment.length
      
      if (currentItem.status !== 'complete') {
        alert(`Cannot confirm item. Item must be in 'complete' status (current: ${currentItem.status})`)
        setSaving(false)
        return
      }
      
      if (totalFactors === 0) {
        alert('Cannot confirm item without any factors. Please add at least one material, labor, or equipment factor.')
        setSaving(false)
        return
      }

      const response = await fetch(`/api/admin/library/items/${currentItem.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationNotes: '' })
      })

      if (response.ok) {
        await refreshItem()
        alert('Item confirmed successfully!')
      } else {
        const error = await response.json()
        console.error('Server error:', error)
        alert(`Failed to confirm item: ${error.error || 'Unknown server error'}`)
      }
    } catch (error) {
      console.error('Failed to confirm item:', error)
      alert(`Failed to confirm item: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkComplete = async () => {
    setSaving(true)
    try {
      // Check prerequisites before marking as complete
      const totalFactors = currentItem.materials.length + currentItem.labor.length + currentItem.equipment.length
      
      if (currentItem.status !== 'draft') {
        alert(`Cannot mark as complete. Item must be in 'draft' status (current: ${currentItem.status})`)
        setSaving(false)
        return
      }
      
      if (totalFactors === 0) {
        alert('Cannot mark item as complete without any factors. Please add at least one material, labor, or equipment factor.')
        setSaving(false)
        return
      }

      const response = await fetch(`/api/admin/library/items/${currentItem.id}/mark-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        await refreshItem()
        alert('Item marked as complete! You can now Accept & Confirm it.')
      } else {
        const error = await response.json()
        console.error('Server error:', error)
        alert(`Failed to mark as complete: ${error.error || 'Unknown server error'}`)
      }
    } catch (error) {
      console.error('Failed to mark as complete:', error)
      alert(`Failed to mark as complete: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleFactorUpdate = async () => {
    await refreshItem()
  }

  return (
    <div className="space-y-2">
      {/* Ultra-Compact Header */}
      <div className="flex items-center justify-between border-b pb-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-base font-medium">{currentItem.code} - {currentItem.name}</h2>
            <p className="text-xs text-muted-foreground">{currentItem.description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshItem} className="h-7 px-2">
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Status Alert */}
      {getStatusAlert()}

      {/* Compact Item Information Summary */}
      <div className="bg-gray-50 p-2 rounded border">
        <div className="grid grid-cols-3 gap-3">
          {/* Column 1: Code, Name, Wastage */}
          <div className="space-y-1">
            <div>
              <Label htmlFor="code" className="text-xs text-gray-600">Code</Label>
              <Input id="code" value={currentItem.code} disabled className="h-6 text-xs px-1.5" />
            </div>
            <div>
              <Label htmlFor="name" className="text-xs text-gray-600">Name</Label>
              <Input id="name" value={currentItem.name} disabled={readonly} className="h-6 text-xs px-1.5" />
            </div>
            <div>
              <Label htmlFor="wastage" className="text-xs text-gray-600">Wastage %</Label>
              <Input 
                id="wastage" 
                type="number" 
                value={currentItem.wastagePercentage} 
                disabled={readonly}
                min="0"
                max="100"
                step="0.01"
                className="h-6 text-xs px-1.5"
              />
            </div>
          </div>
          
          {/* Column 2: Unit, Description, Status */}
          <div className="space-y-1">
            <div>
              <Label htmlFor="unit" className="text-xs text-gray-600">Unit</Label>
              <Input id="unit" value={currentItem.unit} disabled={readonly} className="h-6 text-xs px-1.5" />
            </div>
            <div>
              <Label htmlFor="description" className="text-xs text-gray-600">Description</Label>
              <Input 
                id="description" 
                value={currentItem.description} 
                disabled={readonly} 
                className="h-6 text-xs px-1.5"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Status</Label>
              <div>
                <Badge 
                  className={`text-xs h-5 px-2 ${
                    currentItem.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    currentItem.status === 'complete' ? 'bg-yellow-100 text-yellow-700' :
                    currentItem.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}
                >
                  {currentItem.status}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Column 3: Specifications */}
          <div>
            <Label htmlFor="specifications" className="text-xs text-gray-600">Specifications</Label>
            <Input 
              id="specifications" 
              value={currentItem.specifications || ''} 
              disabled={readonly}
              placeholder="Technical specifications..."
              className="h-6 text-xs px-1.5"
            />
          </div>
        </div>
      </div>

      {/* Dominant Factor Management Section */}
      <div className="flex-1 space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Factor Management ({currentItem.materials.length + currentItem.labor.length + currentItem.equipment.length})
          </h3>
        </div>
        <div className="min-h-96">
          <UnifiedFactorManager 
            item={currentItem}
            onFactorUpdate={handleFactorUpdate}
            readonly={readonly}
          />
        </div>
      </div>

      {/* Mark as Complete Button */}
      {currentItem.status === 'draft' && currentItem.materials.length + currentItem.labor.length + currentItem.equipment.length > 0 && !readonly && (
        <div className="flex justify-end border-t pt-2">
          <Button 
            onClick={handleMarkComplete} 
            className="bg-blue-600 hover:bg-blue-700 h-8 text-sm"
            disabled={saving}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {saving ? 'Marking Complete...' : 'Mark as Complete'}
          </Button>
        </div>
      )}

      {/* Accept & Confirm Button */}
      {currentItem.status === 'complete' && !readonly && (
        <div className="flex justify-end border-t pt-2">
          <Button 
            onClick={handleAcceptItem} 
            className="bg-green-600 hover:bg-green-700 h-8 text-sm"
            disabled={saving}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {saving ? 'Confirming...' : 'Accept & Confirm'}
          </Button>
        </div>
      )}
    </div>
  )
}