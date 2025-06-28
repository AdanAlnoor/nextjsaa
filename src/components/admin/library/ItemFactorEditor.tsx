'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Info,
  Save,
  RefreshCw
} from 'lucide-react'

import type { 
  LibraryItem, 
  ItemFactorEditorProps
} from '@/types/library'
import { UnifiedFactorManager } from './UnifiedFactorManager'

export function ItemFactorEditor({ item, onBack, onSave, readonly = false }: ItemFactorEditorProps) {
  const [currentItem, setCurrentItem] = useState<LibraryItem>(item)
  const [activeTab, setActiveTab] = useState('factors')
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
            Item has {totalFactors} factor(s) added. Review and click 'Accept' to confirm.
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

      {/* Factor Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Item Information</TabsTrigger>
          <TabsTrigger value="factors">
            Factor Management ({currentItem.materials.length + currentItem.labor.length + currentItem.equipment.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
              <CardDescription>Basic item details and specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" value={currentItem.code} disabled />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" value={currentItem.unit} disabled={readonly} />
                </div>
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={currentItem.name} disabled={readonly} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={currentItem.description} disabled={readonly} />
              </div>
              <div>
                <Label htmlFor="specifications">Specifications</Label>
                <Textarea 
                  id="specifications" 
                  value={currentItem.specifications || ''} 
                  disabled={readonly}
                  placeholder="Enter technical specifications..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wastage">Wastage Percentage</Label>
                  <Input 
                    id="wastage" 
                    type="number" 
                    value={currentItem.wastagePercentage} 
                    disabled={readonly}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-2">
                    <Badge 
                      className={
                        currentItem.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        currentItem.status === 'complete' ? 'bg-yellow-100 text-yellow-700' :
                        currentItem.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }
                    >
                      {currentItem.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors" className="mt-6">
          <UnifiedFactorManager 
            item={currentItem}
            onFactorUpdate={handleFactorUpdate}
            readonly={readonly}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}