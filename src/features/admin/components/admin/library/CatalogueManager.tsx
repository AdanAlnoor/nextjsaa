'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/components/ui/use-toast'
import { 
  RefreshCw,
  Package,
  Users,
  Wrench,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'

import type { 
  MaterialCatalogueItem, 
  LaborCatalogueItem, 
  EquipmentCatalogueItem,
  CatalogueManagerProps
} from '@/library/types/library'
import { getWorkCategoryIcon, WORK_CATEGORIES } from '@/library/types/library'

export function CatalogueManager({ activeTab = 'materials', onItemSelect }: CatalogueManagerProps) {
  const { toast } = useToast()
  const [currentTab, setCurrentTab] = useState(activeTab)
  const [materials, setMaterials] = useState<MaterialCatalogueItem[]>([])
  const [labor, setLabor] = useState<LaborCatalogueItem[]>([])
  const [equipment, setEquipment] = useState<EquipmentCatalogueItem[]>([])
  const [loading, setLoading] = useState(false)

  // Search and filter states
  const [globalSearch, setGlobalSearch] = useState('')
  const [selectedWorkCategory, setSelectedWorkCategory] = useState('')
  const [materialSearch, setMaterialSearch] = useState('')
  const [laborSearch, setLaborSearch] = useState('')
  const [equipmentSearch, setEquipmentSearch] = useState('')

  // Filter states
  const [materialCategories, setMaterialCategories] = useState<string[]>([])
  const [laborCategories, setLaborCategories] = useState<string[]>([])
  const [equipmentCategories, setEquipmentCategories] = useState<string[]>([])
  const [workCategories, setWorkCategories] = useState<string[]>([])

  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState('')
  const [selectedLaborCategory, setSelectedLaborCategory] = useState('')
  const [selectedEquipmentCategory, setSelectedEquipmentCategory] = useState('')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [modalType, setModalType] = useState<'material' | 'labor' | 'equipment'>('material')
  const [saving, setSaving] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    unit: '',
    specifications: '',
    gradeStandard: '',
    skillLevel: '',
    tradeType: '',
    qualifications: '',
    capacity: '',
    powerRequirements: '',
    workCategory: ''
  })

  useEffect(() => {
    loadCatalogues()
  }, [])

  const loadCatalogues = async () => {
    setLoading(true)
    try {
      const [materialsRes, laborRes, equipmentRes] = await Promise.all([
        fetch('/api/admin/library/catalogues/materials'),
        fetch('/api/admin/library/catalogues/labor'),
        fetch('/api/admin/library/catalogues/equipment')
      ])

      let materialsData, laborData, equipmentData
      const allWorkCategories = new Set<string>()

      if (materialsRes.ok) {
        materialsData = await materialsRes.json()
        setMaterials(materialsData.data || [])
        setMaterialCategories(materialsData.filters?.categories || [])
        materialsData.filters?.workCategories?.forEach((cat: string) => allWorkCategories.add(cat))
      }

      if (laborRes.ok) {
        laborData = await laborRes.json()
        setLabor(laborData.data || [])
        setLaborCategories(laborData.filters?.categories || [])
        laborData.filters?.workCategories?.forEach((cat: string) => allWorkCategories.add(cat))
      }

      if (equipmentRes.ok) {
        equipmentData = await equipmentRes.json()
        setEquipment(equipmentData.data || [])
        setEquipmentCategories(equipmentData.filters?.categories || [])
        equipmentData.filters?.workCategories?.forEach((cat: string) => allWorkCategories.add(cat))
      }

      setWorkCategories(Array.from(allWorkCategories).sort())
    } catch (error) {
      console.error('Failed to load catalogues:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMaterials = materials.filter(material => {
    const searchTerm = globalSearch || materialSearch
    const matchesSearch = !searchTerm || 
                         material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedMaterialCategory || material.category === selectedMaterialCategory
    const matchesWorkCategory = !selectedWorkCategory || selectedWorkCategory === 'all' || material.workCategory === selectedWorkCategory
    return matchesSearch && matchesCategory && matchesWorkCategory
  })

  const filteredLabor = labor.filter(laborItem => {
    const searchTerm = globalSearch || laborSearch
    const matchesSearch = !searchTerm ||
                         laborItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         laborItem.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         laborItem.tradeType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedLaborCategory || laborItem.category === selectedLaborCategory
    const matchesWorkCategory = !selectedWorkCategory || selectedWorkCategory === 'all' || laborItem.workCategory === selectedWorkCategory
    return matchesSearch && matchesCategory && matchesWorkCategory
  })

  const filteredEquipment = equipment.filter(equipmentItem => {
    const searchTerm = globalSearch || equipmentSearch
    const matchesSearch = !searchTerm ||
                         equipmentItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipmentItem.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedEquipmentCategory || equipmentItem.category === selectedEquipmentCategory
    const matchesWorkCategory = !selectedWorkCategory || selectedWorkCategory === 'all' || equipmentItem.workCategory === selectedWorkCategory
    return matchesSearch && matchesCategory && matchesWorkCategory
  })

  const handleDeleteItem = async (type: 'material' | 'labor' | 'equipment', id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const endpoint = `/api/admin/library/catalogues/${type === 'material' ? 'materials' : type}/${id}`
      const response = await fetch(endpoint, { method: 'DELETE' })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
        })
        loadCatalogues()
      } else {
        throw new Error('Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      category: '',
      unit: '',
      specifications: '',
      gradeStandard: '',
      skillLevel: '',
      tradeType: '',
      qualifications: '',
      capacity: '',
      powerRequirements: '',
      workCategory: ''
    })
  }

  const openAddModal = (type: 'material' | 'labor' | 'equipment') => {
    resetForm()
    setModalType(type)
    setShowAddModal(true)
  }

  const openEditModal = (type: 'material' | 'labor' | 'equipment', item: any) => {
    setModalType(type)
    setEditingItem(item)
    
    // Populate form based on item type
    if (type === 'material') {
      setFormData({
        code: item.code || '',
        name: item.name || '',
        category: item.category || '',
        unit: item.unit || '',
        specifications: item.specifications || '',
        gradeStandard: item.gradeStandard || '',
        workCategory: item.workCategory || '',
        skillLevel: '',
        tradeType: '',
        qualifications: '',
        capacity: '',
        powerRequirements: ''
      })
    } else if (type === 'labor') {
      setFormData({
        code: item.code || '',
        name: item.name || '',
        category: item.category || '',
        skillLevel: item.skillLevel || '',
        tradeType: item.tradeType || '',
        qualifications: item.qualifications || '',
        workCategory: item.workCategory || '',
        unit: '',
        specifications: '',
        gradeStandard: '',
        capacity: '',
        powerRequirements: ''
      })
    } else if (type === 'equipment') {
      setFormData({
        code: item.code || '',
        name: item.name || '',
        category: item.category || '',
        capacity: item.capacity || '',
        specifications: item.specifications || '',
        powerRequirements: item.powerRequirements || '',
        workCategory: item.workCategory || '',
        unit: '',
        gradeStandard: '',
        skillLevel: '',
        tradeType: '',
        qualifications: ''
      })
    }
    
    setShowEditModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const isEdit = showEditModal && editingItem
      
      // Validate required fields based on modal type
      if (!formData.name || !formData.category) {
        toast({
          title: 'Validation Error',
          description: 'Name and category are required',
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      if (modalType === 'material' && !formData.unit) {
        toast({
          title: 'Validation Error', 
          description: 'Unit is required for materials',
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      if (modalType === 'labor' && (!formData.skillLevel || !formData.tradeType)) {
        toast({
          title: 'Validation Error',
          description: 'Skill level and trade type are required for labor',
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      const endpoint = isEdit 
        ? `/api/admin/library/catalogues/${modalType === 'material' ? 'materials' : modalType}/${editingItem.id}`
        : `/api/admin/library/catalogues/${modalType === 'material' ? 'materials' : modalType}`
      
      const method = isEdit ? 'PUT' : 'POST'
      
      let submitData = {
        ...formData,
        workCategory: formData.workCategory === 'none' ? '' : formData.workCategory
      }
      
      // Remove code field for new items (it will be auto-generated)
      if (!isEdit && 'code' in submitData) {
        const { code, ...dataWithoutCode } = submitData
        submitData = dataWithoutCode as any
      }

      console.log('Form data before submit:', formData)
      console.log('Submitting data:', submitData)
      console.log('Modal type:', modalType)
      console.log('Endpoint:', endpoint)

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: 'Success',
          description: result.message || `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} ${isEdit ? 'updated' : 'created'} successfully`,
        })
        
        // Close modals and refresh data
        setShowAddModal(false)
        setShowEditModal(false)
        setEditingItem(null)
        resetForm()
        loadCatalogues()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save item')
      }
    } catch (error) {
      console.error('Error saving item:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save item',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <h1 className="text-base font-medium">Catalog Management</h1>
        <div className="flex gap-1">
          <Button 
            size="sm"
            className="h-8 text-sm"
            onClick={() => {
              const type = currentTab === 'materials' ? 'material' : 
                          currentTab === 'labor' ? 'labor' : 'equipment'
              openAddModal(type)
            }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={loadCatalogues} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Compact Filters with Summary */}
      <div className="flex items-center gap-2 px-1 pb-2">
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Select value={selectedWorkCategory} onValueChange={setSelectedWorkCategory}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Work category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {workCategories.map(category => (
              <SelectItem key={category} value={category}>
                <div className="flex items-center gap-1">
                  <span className="text-xs">{getWorkCategoryIcon(category)}</span>
                  <span className="text-sm">{category}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Inline Summary Stats */}
        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>{materials.length} Materials</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{labor.length} Labor</span>
          </div>
          <div className="flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            <span>{equipment.length} Equipment</span>
          </div>
        </div>
      </div>


      {/* Maximized Table Area */}
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'materials' | 'labor' | 'equipment')} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 h-9 bg-transparent p-0 border-b">
          <TabsTrigger 
            value="materials" 
            className="flex items-center gap-1 text-sm rounded-none bg-transparent border-b-3 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:font-semibold"
          >
            <Package className="w-3 h-3" />
            Materials ({materials.length})
          </TabsTrigger>
          <TabsTrigger 
            value="labor" 
            className="flex items-center gap-1 text-sm rounded-none bg-transparent border-b-3 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:font-semibold"
          >
            <Users className="w-3 h-3" />
            Labor ({labor.length})
          </TabsTrigger>
          <TabsTrigger 
            value="equipment" 
            className="flex items-center gap-1 text-sm rounded-none bg-transparent border-b-3 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:font-semibold"
          >
            <Wrench className="w-3 h-3" />
            Equipment ({equipment.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="flex-1 mt-2 overflow-hidden">
          <div className="h-full flex flex-col border rounded-lg overflow-hidden">
            {/* Compact Search Bar */}
            <div className="flex gap-2 p-2 border-b">
              <Input
                placeholder="Search materials..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Select
                value={selectedMaterialCategory || 'all'}
                onValueChange={(value) => setSelectedMaterialCategory(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[150px] h-8 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {materialCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="h-9">
                    <TableHead className="py-2">Code</TableHead>
                    <TableHead className="py-2">Name</TableHead>
                    <TableHead className="py-2">Category</TableHead>
                    <TableHead className="py-2">Unit</TableHead>
                    <TableHead className="py-2">Grade/Standard</TableHead>
                    <TableHead className="py-2">Work Category</TableHead>
                    <TableHead className="py-2">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow 
                      key={material.id}
                      className={`h-10 ${onItemSelect ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => onItemSelect?.(material)}
                    >
                      <TableCell className="py-1">
                        <Badge variant="outline" className="text-xs h-5">{material.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium py-1 text-sm">{material.name}</TableCell>
                      <TableCell className="py-1">
                        <Badge variant="secondary" className="text-xs h-5">{material.category}</Badge>
                      </TableCell>
                      <TableCell className="py-1 text-sm">{material.unit}</TableCell>
                      <TableCell className="text-xs py-1">{material.gradeStandard || 'N/A'}</TableCell>
                      <TableCell className="py-1">
                        {material.workCategory && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{getWorkCategoryIcon(material.workCategory)}</span>
                            <Badge variant="outline" className="text-xs h-5">
                              {material.workCategory}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal('material', material)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteItem('material', material.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredMaterials.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {materialSearch || selectedMaterialCategory 
                    ? 'No materials match the current filters'
                    : 'No materials available'
                  }
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="labor" className="flex-1 mt-2 overflow-hidden">
          <div className="h-full flex flex-col border rounded-lg overflow-hidden">
            {/* Compact Search Bar */}
            <div className="flex gap-2 p-2 border-b">
              <Input
                placeholder="Search labor..."
                value={laborSearch}
                onChange={(e) => setLaborSearch(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Select
                value={selectedLaborCategory || 'all'}
                onValueChange={(value) => setSelectedLaborCategory(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[150px] h-8 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {laborCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="h-9">
                    <TableHead className="py-2">Code</TableHead>
                    <TableHead className="py-2">Name</TableHead>
                    <TableHead className="py-2">Category</TableHead>
                    <TableHead className="py-2">Skill Level</TableHead>
                    <TableHead className="py-2">Trade Type</TableHead>
                    <TableHead className="py-2">Work Category</TableHead>
                    <TableHead className="py-2">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLabor.map((laborItem) => (
                    <TableRow 
                      key={laborItem.id}
                      className={`h-10 ${onItemSelect ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => onItemSelect?.(laborItem)}
                    >
                      <TableCell className="py-1">
                        <Badge variant="outline" className="text-xs h-5">{laborItem.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium py-1 text-sm">{laborItem.name}</TableCell>
                      <TableCell className="py-1">
                        <Badge variant="secondary" className="text-xs h-5">{laborItem.category}</Badge>
                      </TableCell>
                      <TableCell className="py-1">
                        <Badge 
                          className={`text-xs h-5 ${
                            laborItem.skillLevel === 'Professional' ? 'bg-purple-100 text-purple-700' :
                            laborItem.skillLevel === 'Specialist' ? 'bg-blue-100 text-blue-700' :
                            laborItem.skillLevel === 'Skilled' ? 'bg-green-100 text-green-700' :
                            laborItem.skillLevel === 'Semi-skilled' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }}`}
                        >
                          {laborItem.skillLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1 text-sm">{laborItem.tradeType}</TableCell>
                      <TableCell className="py-1">
                        {laborItem.workCategory && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{getWorkCategoryIcon(laborItem.workCategory)}</span>
                            <Badge variant="outline" className="text-xs h-5">
                              {laborItem.workCategory}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal('labor', laborItem)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteItem('labor', laborItem.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredLabor.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {laborSearch || selectedLaborCategory 
                    ? 'No labor items match the current filters'
                    : 'No labor items available'
                  }
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="flex-1 mt-2 overflow-hidden">
          <div className="h-full flex flex-col border rounded-lg overflow-hidden">
            {/* Compact Search Bar */}
            <div className="flex gap-2 p-2 border-b">
              <Input
                placeholder="Search equipment..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Select
                value={selectedEquipmentCategory || 'all'}
                onValueChange={(value) => setSelectedEquipmentCategory(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[150px] h-8 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {equipmentCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="h-9">
                    <TableHead className="py-2">Code</TableHead>
                    <TableHead className="py-2">Name</TableHead>
                    <TableHead className="py-2">Category</TableHead>
                    <TableHead className="py-2">Capacity</TableHead>
                    <TableHead className="py-2">Power Requirements</TableHead>
                    <TableHead className="py-2">Work Category</TableHead>
                    <TableHead className="py-2">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((equipmentItem) => (
                    <TableRow 
                      key={equipmentItem.id}
                      className={`h-10 ${onItemSelect ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => onItemSelect?.(equipmentItem)}
                    >
                      <TableCell className="py-1">
                        <Badge variant="outline" className="text-xs h-5">{equipmentItem.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium py-1 text-sm">{equipmentItem.name}</TableCell>
                      <TableCell className="py-1">
                        <Badge variant="secondary" className="text-xs h-5">{equipmentItem.category}</Badge>
                      </TableCell>
                      <TableCell className="py-1 text-sm">{equipmentItem.capacity || 'N/A'}</TableCell>
                      <TableCell className="text-xs py-1">
                        {equipmentItem.powerRequirements || 'N/A'}
                      </TableCell>
                      <TableCell className="py-1">
                        {equipmentItem.workCategory && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{getWorkCategoryIcon(equipmentItem.workCategory)}</span>
                            <Badge variant="outline" className="text-xs h-5">
                              {equipmentItem.workCategory}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal('equipment', equipmentItem)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteItem('equipment', equipmentItem.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredEquipment.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {equipmentSearch || selectedEquipmentCategory 
                    ? 'No equipment items match the current filters'
                    : 'No equipment items available'
                  }
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New {modalType.charAt(0).toUpperCase() + modalType.slice(1)}</DialogTitle>
            <DialogDescription>
              Create a new {modalType} item in the catalogue
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter item name"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Code will be auto-generated</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">
                  {modalType === 'material' ? 'Material Type' : 
                   modalType === 'labor' ? 'Labor Category' : 
                   'Equipment Type'} *
                </Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder={modalType === 'material' ? 'e.g., Cement, Steel, Aggregate' :
                              modalType === 'labor' ? 'e.g., Construction, Finishing' :
                              'e.g., Heavy Machinery, Tools'}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {modalType === 'material' ? 'Type of material (cement, steel, etc.)' :
                   modalType === 'labor' ? 'Category of labor (mason, carpenter, etc.)' :
                   'Type of equipment (machinery, tools, etc.)'}
                </p>
              </div>
              <div>
                <Label htmlFor="workCategory">Construction Work Category</Label>
                <Select 
                  value={formData.workCategory} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, workCategory: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select construction work category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No work category</SelectItem>
                    {WORK_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        <div className="flex items-center gap-2">
                          <span>{getWorkCategoryIcon(category)}</span>
                          <span>{category}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  Which construction work this item is typically used for
                </p>
              </div>
            </div>

            {/* Material-specific fields */}
            {modalType === 'material' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit">Unit *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="e.g., kg, m³, pieces"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gradeStandard">Grade/Standard</Label>
                    <Input
                      id="gradeStandard"
                      value={formData.gradeStandard}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradeStandard: e.target.value }))}
                      placeholder="Enter grade or standard"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="specifications">Specifications</Label>
                  <Textarea
                    id="specifications"
                    value={formData.specifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder="Enter material specifications"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Labor-specific fields */}
            {modalType === 'labor' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="skillLevel">Skill Level *</Label>
                    <Select 
                      value={formData.skillLevel} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, skillLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unskilled">Unskilled</SelectItem>
                        <SelectItem value="Semi-skilled">Semi-skilled</SelectItem>
                        <SelectItem value="Skilled">Skilled</SelectItem>
                        <SelectItem value="Specialist">Specialist</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tradeType">Trade Type *</Label>
                    <Input
                      id="tradeType"
                      value={formData.tradeType}
                      onChange={(e) => setFormData(prev => ({ ...prev, tradeType: e.target.value }))}
                      placeholder="e.g., Mason, Carpenter"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                    placeholder="Enter required qualifications"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Equipment-specific fields */}
            {modalType === 'equipment' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="e.g., 2 tons, 100 HP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="powerRequirements">Power Requirements</Label>
                    <Input
                      id="powerRequirements"
                      value={formData.powerRequirements}
                      onChange={(e) => setFormData(prev => ({ ...prev, powerRequirements: e.target.value }))}
                      placeholder="e.g., 220V, Diesel"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="specifications">Specifications</Label>
                  <Textarea
                    id="specifications"
                    value={formData.specifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder="Enter equipment specifications"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {modalType.charAt(0).toUpperCase() + modalType.slice(1)}</DialogTitle>
            <DialogDescription>
              Update the {modalType} item details
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter code"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Input
                  id="edit-category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Enter category"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-workCategory">Work Category</Label>
                <Select 
                  value={formData.workCategory} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, workCategory: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No work category</SelectItem>
                    {WORK_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        <div className="flex items-center gap-2">
                          <span>{getWorkCategoryIcon(category)}</span>
                          <span>{category}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Material-specific fields */}
            {modalType === 'material' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-unit">Unit *</Label>
                    <Input
                      id="edit-unit"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="e.g., kg, m³, pieces"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-gradeStandard">Grade/Standard</Label>
                    <Input
                      id="edit-gradeStandard"
                      value={formData.gradeStandard}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradeStandard: e.target.value }))}
                      placeholder="Enter grade or standard"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-specifications">Specifications</Label>
                  <Textarea
                    id="edit-specifications"
                    value={formData.specifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder="Enter material specifications"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Labor-specific fields */}
            {modalType === 'labor' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-skillLevel">Skill Level *</Label>
                    <Select 
                      value={formData.skillLevel} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, skillLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unskilled">Unskilled</SelectItem>
                        <SelectItem value="Semi-skilled">Semi-skilled</SelectItem>
                        <SelectItem value="Skilled">Skilled</SelectItem>
                        <SelectItem value="Specialist">Specialist</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-tradeType">Trade Type *</Label>
                    <Input
                      id="edit-tradeType"
                      value={formData.tradeType}
                      onChange={(e) => setFormData(prev => ({ ...prev, tradeType: e.target.value }))}
                      placeholder="e.g., Mason, Carpenter"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-qualifications">Qualifications</Label>
                  <Textarea
                    id="edit-qualifications"
                    value={formData.qualifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                    placeholder="Enter required qualifications"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Equipment-specific fields */}
            {modalType === 'equipment' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-capacity">Capacity</Label>
                    <Input
                      id="edit-capacity"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="e.g., 2 tons, 100 HP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-powerRequirements">Power Requirements</Label>
                    <Input
                      id="edit-powerRequirements"
                      value={formData.powerRequirements}
                      onChange={(e) => setFormData(prev => ({ ...prev, powerRequirements: e.target.value }))}
                      placeholder="e.g., 220V, Diesel"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-specifications">Specifications</Label>
                  <Textarea
                    id="edit-specifications"
                    value={formData.specifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder="Enter equipment specifications"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
              Update {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}