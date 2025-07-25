'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { 
  ArrowLeft, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info
} from 'lucide-react'

import type { 
  LibraryItem, 
  ItemFactorEditorProps
} from '@/library/types/library'
import { UnifiedFactorManager } from './UnifiedFactorManager'

export function ItemFactorEditor({ item, onBack, onItemUpdate, readonly = false }: ItemFactorEditorProps) {
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
    } else if (currentItem.status === 'complete') {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Item has {totalFactors} factor(s) added. Review and click &apos;Accept&apos; to confirm.
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
      const response = await fetch(`/api/admin/library/items/${currentItem.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationNotes: '' })
      })

      if (response.ok) {
        await refreshItem()
        // Notify parent component that item was updated
        onItemUpdate?.()
      } else {
        const error = await response.json()
        alert(`Failed to confirm item: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to confirm item:', error)
      alert('Failed to confirm item')
    } finally {
      setSaving(false)
    }
  }

  const handleFactorUpdate = async () => {
    await refreshItem()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{currentItem.code} - {currentItem.name}</h2>
            <p className="text-gray-600">{currentItem.description}</p>
          </div>
        </div>
        <Button variant="outline" onClick={refreshItem}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Alert */}
      {getStatusAlert()}

      {/* Accept Button */}
      {currentItem.status === 'complete' && !readonly && (
        <div className="flex justify-end">
          <Button 
            onClick={handleAcceptItem} 
            className="bg-green-600 hover:bg-green-700"
            disabled={saving}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {saving ? 'Confirming...' : 'Accept & Confirm'}
          </Button>
        </div>
      )}

      {/* Compact Item Information Summary */}
      <div className="bg-gray-50 p-3 rounded border">
        <div className="grid grid-cols-4 gap-3 mb-3">
          {/* Row 1: Code, Name, Unit, Status */}
          <div>
            <Label htmlFor="code" className="text-xs text-gray-600">Code</Label>
            <Input id="code" value={currentItem.code} disabled className="h-8 text-sm" />
          </div>
          <div>
            <Label htmlFor="name" className="text-xs text-gray-600">Name</Label>
            <Input id="name" value={currentItem.name} disabled={readonly} className="h-8 text-sm" />
          </div>
          <div>
            <Label htmlFor="unit" className="text-xs text-gray-600">Unit</Label>
            <Input id="unit" value={currentItem.unit} disabled={readonly} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Status</Label>
            <div className="mt-1">
              <Badge 
                className={`text-xs h-6 px-2 ${
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
        
        <div className="grid grid-cols-3 gap-3">
          {/* Row 2: Description, Specifications, Wastage */}
          <div>
            <Label htmlFor="description" className="text-xs text-gray-600">Description</Label>
            <Input 
              id="description" 
              value={currentItem.description} 
              disabled={readonly}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="specifications" className="text-xs text-gray-600">Specifications</Label>
            <Input 
              id="specifications" 
              value={currentItem.specifications || ''} 
              disabled={readonly}
              placeholder="Technical specifications..."
              className="h-8 text-sm"
            />
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
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Factor Management Section (75% of space) */}
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
    </div>
  )
}