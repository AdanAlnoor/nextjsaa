'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, ChevronDown } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Badge } from '@/shared/components/ui/badge'

import type { Division, Section, Assembly } from '@/library/types/library'

interface AddLibraryItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  parentLevel?: number // 0=root, 1=division, 2=section, 3=assembly
  parentId?: string
  parentCode?: string
  parentName?: string
}

interface FormData {
  name: string
  unit: string
  specifications: string
  wastagePercentage: string
  productivityNotes: string
  code: string
}

const HIERARCHY_LEVELS = [
  { value: 1, label: 'Division', format: 'XX', example: '02' },
  { value: 2, label: 'Section', format: 'XX.XX', example: '02.10' },
  { value: 3, label: 'Assembly', format: 'XX.XX.XX', example: '02.10.10' },
  { value: 4, label: 'Library Item', format: 'XX.XX.XX.XX', example: '02.10.10.01' }
]

const COMMON_UNITS = [
  'm³', 'm²', 'm', 'mm', 'cm', 'km',
  'kg', 't', 'g', 'L', 'mL',
  'pcs', 'each', 'set', 'lot', 'box',
  'hr', 'day', 'week', 'month',
  'ft', 'ft²', 'ft³', 'in', 'lb', 'gal'
]

export function AddLibraryItemDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  parentLevel = 0,
  parentId,
  parentCode,
  parentName 
}: AddLibraryItemDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    unit: '',
    specifications: '',
    wastagePercentage: '0',
    productivityNotes: '',
    code: ''
  })

  const [creating, setCreating] = useState(false)
  const [previewCode, setPreviewCode] = useState('')
  const [targetLevel, setTargetLevel] = useState(parentLevel + 1)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [selectedAssembly, setSelectedAssembly] = useState<string>('')
  const [isParentLocked, setIsParentLocked] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        unit: '',
        specifications: '',
        wastagePercentage: '0',
        productivityNotes: '',
        code: ''
      })
      setPreviewCode('')
      setSelectedDivision('')
      setSelectedSection('')
      setSelectedAssembly('')
      setIsParentLocked(false)
    } else {
      setTargetLevel(parentLevel + 1)
      loadHierarchyData().then(() => {
        setupParentContext()
        generateCodePreview()
      })
    }
  }, [isOpen, parentLevel, parentId, parentCode])

  // Setup parent context when we have parent information
  const setupParentContext = () => {
    console.log(`[AddDialog] Setting up parent context: level=${parentLevel}, id=${parentId}, code=${parentCode}`)
    
    if (parentLevel > 0 && parentId && parentCode) {
      setIsParentLocked(true)
      
      // Auto-select the appropriate parent based on the parent level
      switch (parentLevel) {
        case 1: // Parent is division, we're adding a section
          setSelectedDivision(parentId)
          console.log(`[AddDialog] Auto-selected division: ${parentId} (${parentCode})`)
          break
        case 2: // Parent is section, we're adding an assembly
          setSelectedSection(parentId)
          // Find and set the parent division
          const parentSection = sections.find(s => s.id === parentId)
          if (parentSection) {
            const parentDivision = divisions.find(d => 
              d.sections.some(s => s.id === parentId)
            )
            if (parentDivision) {
              setSelectedDivision(parentDivision.id)
              console.log(`[AddDialog] Auto-selected section: ${parentId} and division: ${parentDivision.id}`)
            }
          }
          break
        case 3: // Parent is assembly, we're adding an item
          setSelectedAssembly(parentId)
          // Find parent section and division
          const parentAssembly = assemblies.find(a => a.id === parentId)
          if (parentAssembly) {
            const parentSectionForAssembly = sections.find(s => 
              s.assemblies.some(a => a.id === parentId)
            )
            if (parentSectionForAssembly) {
              setSelectedSection(parentSectionForAssembly.id)
              const parentDivisionForAssembly = divisions.find(d => 
                d.sections.some(s => s.id === parentSectionForAssembly.id)
              )
              if (parentDivisionForAssembly) {
                setSelectedDivision(parentDivisionForAssembly.id)
                console.log(`[AddDialog] Auto-selected assembly: ${parentId}, section: ${parentSectionForAssembly.id}, division: ${parentDivisionForAssembly.id}`)
              }
            }
          }
          break
      }
    }
  }

  // Generate code preview when form data changes
  useEffect(() => {
    if (isOpen) {
      generateCodePreview()
    }
  }, [formData.name, targetLevel, selectedDivision, selectedSection, selectedAssembly])

  const loadHierarchyData = async () => {
    try {
      // Load divisions for parent selection
      const response = await fetch('/api/admin/library/divisions')
      if (response.ok) {
        const data = await response.json()
        setDivisions(data)

        // Extract sections and assemblies for easier access
        const allSections: Section[] = []
        const allAssemblies: Assembly[] = []

        data.forEach((division: Division) => {
          allSections.push(...division.sections)
          division.sections.forEach((section: Section) => {
            allAssemblies.push(...section.assemblies)
          })
        })

        setSections(allSections)
        setAssemblies(allAssemblies)
      }
    } catch (error) {
      console.error('Failed to load hierarchy data:', error)
    }
  }

  const generateCodePreview = async () => {
    if (formData.code) {
      setPreviewCode(`Using custom code: ${formData.code}`)
      return
    }

    if (!formData.name) {
      setPreviewCode('Enter a name to see code preview')
      return
    }

    try {
      console.log(`[AddDialog] Generating code preview for level ${targetLevel}`)
      let parentCodeForGeneration = ''

      if (targetLevel === 1) {
        // Division - no parent needed
        parentCodeForGeneration = ''
      } else if (targetLevel === 2) {
        // Section - needs division
        const division = divisions.find(d => d.id === selectedDivision)
        parentCodeForGeneration = division?.code || ''
      } else if (targetLevel === 3) {
        // Assembly - needs section
        const section = sections.find(s => s.id === selectedSection)
        parentCodeForGeneration = section?.code || ''
      } else if (targetLevel === 4) {
        // Item - needs assembly
        const assembly = assemblies.find(a => a.id === selectedAssembly)
        parentCodeForGeneration = assembly?.code || ''
      }

      if (targetLevel > 1 && !parentCodeForGeneration) {
        setPreviewCode('Please select parent first')
        return
      }

      setPreviewCode('Generating...')

      // Call dedicated preview endpoint
      const response = await fetch('/api/admin/library/preview-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: targetLevel,
          parentCode: parentCodeForGeneration || null
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const generatedCode = result.code
        if (generatedCode) {
          setPreviewCode(`Next available: ${generatedCode}`)
          console.log(`[AddDialog] Generated preview code: ${generatedCode}`)
        } else {
          setPreviewCode('Unable to generate preview')
        }
      } else {
        const error = await response.json()
        console.error('[AddDialog] Preview generation failed:', error)
        setPreviewCode(`Error: ${error.error || 'Failed to generate preview'}`)
      }

    } catch (error) {
      console.error('Failed to generate code preview:', error)
      setPreviewCode('Error generating preview')
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Name is required')
      return
    }

    if (targetLevel === 4 && !formData.unit.trim()) {
      alert('Unit is required for library items')
      return
    }

    setCreating(true)
    try {
      let endpoint = ''
      let requestData: any = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined
      }

      switch (targetLevel) {
        case 1: // Division
          endpoint = '/api/admin/library/divisions'
          break
        case 2: // Section
          endpoint = '/api/admin/library/sections'
          requestData.divisionId = selectedDivision
          break
        case 3: // Assembly
          endpoint = '/api/admin/library/assemblies'
          requestData.sectionId = selectedSection
          break
        case 4: // Library Item
          endpoint = '/api/admin/library/items'
          requestData.assemblyId = selectedAssembly
          requestData.unit = formData.unit.trim()
          requestData.specifications = formData.specifications.trim() || undefined
          requestData.wastagePercentage = parseFloat(formData.wastagePercentage) || 0
          requestData.productivityNotes = formData.productivityNotes.trim() || undefined
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        alert(`Failed to create ${HIERARCHY_LEVELS[targetLevel - 1].label.toLowerCase()}: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create item:', error)
      alert('Failed to create item. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const isFormValid = () => {
    if (!formData.name.trim()) return false
    
    if (targetLevel === 4 && !formData.unit.trim()) return false
    
    if (targetLevel > 1) {
      switch (targetLevel) {
        case 2:
          return !!selectedDivision
        case 3:
          return !!selectedSection
        case 4:
          return !!selectedAssembly
      }
    }
    
    return true
  }

  const currentLevelInfo = HIERARCHY_LEVELS[targetLevel - 1]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Add {currentLevelInfo?.label}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {parentName && `Under: ${parentCode} - ${parentName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          {/* Parent Selection (for levels > 1) */}
          {targetLevel > 1 && (
            <div className="space-y-3">
              
              {targetLevel >= 2 && (
                <div>
                  <Label htmlFor="division">Division</Label>
                  <Select 
                    value={selectedDivision} 
                    onValueChange={setSelectedDivision}
                    disabled={isParentLocked && parentLevel >= 1}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division..." />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.code} - {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetLevel >= 3 && (
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select 
                    value={selectedSection} 
                    onValueChange={setSelectedSection}
                    disabled={isParentLocked && parentLevel >= 2}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sections
                        .filter(section => !selectedDivision || 
                          divisions.find(d => d.id === selectedDivision)?.sections.some(s => s.id === section.id))
                        .map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.code} - {section.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetLevel >= 4 && (
                <div>
                  <Label htmlFor="assembly">Assembly</Label>
                  <Select 
                    value={selectedAssembly} 
                    onValueChange={setSelectedAssembly}
                    disabled={isParentLocked && parentLevel >= 3}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assembly..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assemblies
                        .filter(assembly => !selectedSection || 
                          sections.find(s => s.id === selectedSection)?.assemblies.some(a => a.id === assembly.id))
                        .map((assembly) => (
                          <SelectItem key={assembly.id} value={assembly.id}>
                            {assembly.code} - {assembly.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={`Enter ${currentLevelInfo?.label.toLowerCase()} name`}
                className="mt-1"
              />
            </div>

            {targetLevel === 1 ? (
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder={currentLevelInfo?.example}
                  className="mt-1"
                />
              </div>
            ) : (
              <div>
                <Label>Code</Label>
                <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
                  {previewCode || 'Code will be auto-generated'}
                </div>
              </div>
            )}
          </div>

          {/* Library Item Specific Fields */}
          {targetLevel === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wastage">Wastage %</Label>
                  <Input
                    id="wastage"
                    type="number"
                    value={formData.wastagePercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, wastagePercentage: e.target.value }))}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="specifications">Specifications</Label>
                <Textarea
                  id="specifications"
                  value={formData.specifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                  placeholder="Technical specifications"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="productivity">Productivity Notes</Label>
                <Textarea
                  id="productivity"
                  value={formData.productivityNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, productivityNotes: e.target.value }))}
                  placeholder="Productivity notes and guidelines"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid() || creating}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create {currentLevelInfo?.label}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}