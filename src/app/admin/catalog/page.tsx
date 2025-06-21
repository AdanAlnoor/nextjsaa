'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Package, CheckCircle, FolderTree, Building, Plus, Search, Edit, Trash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CatalogItem = {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string | null
  default_unit: string | null
  default_supplier_id: string | null
  last_purchase_price: number | null
  average_price: number | null
  min_order_quantity: number
  lead_time_days: number
  keywords: string[] | null
  specifications: Record<string, any>
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
  category?: { id: string; name: string } | null
  supplier?: { id: string; name: string } | null
}

type Category = {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  code: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type Supplier = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

type Stats = {
  totalItems: number
  activeItems: number
  categories: number
  suppliers: number
}

export default function CatalogManagementPage() {
  const { toast } = useToast()
  const supabase = createClient()
  
  // State
  const [stats, setStats] = useState<Stats>({ totalItems: 0, activeItems: 0, categories: 0, suppliers: 0 })
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // Dialog states
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  
  // Form states
  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    description: '',
    category_id: '',
    default_unit: '',
    default_supplier_id: '',
    last_purchase_price: '',
    min_order_quantity: '1',
    lead_time_days: '0',
    keywords: '',
    is_active: true
  })
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    code: '',
    parent_id: '',
    is_active: true
  })

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadCatalogItems(),
        loadCategories(),
        loadSuppliers()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load catalog data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    const [itemsResult, categoriesResult, suppliersResult] = await Promise.all([
      supabase.from('catalog_items').select('id, is_active'),
      supabase.from('item_categories').select('id'),
      supabase.from('suppliers').select('id')
    ])

    const totalItems = itemsResult.data?.length || 0
    const activeItems = itemsResult.data?.filter(item => item.is_active).length || 0
    const categories = categoriesResult.data?.length || 0
    const suppliers = suppliersResult.data?.length || 0

    setStats({ totalItems, activeItems, categories, suppliers })
  }

  const loadCatalogItems = async () => {
    const { data, error } = await supabase
      .from('catalog_items')
      .select(`
        *,
        category:item_categories(id, name),
        supplier:suppliers(id, name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    setCatalogItems(data || [])
  }

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('item_categories')
      .select('*')
      .order('name')

    if (error) throw error
    setCategories(data || [])
  }

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (error) throw error
    setSuppliers(data || [])
  }

  const handleAddItem = async () => {
    try {
      // Validate required fields
      if (!itemForm.code.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Item code is required',
          variant: 'destructive',
        })
        return
      }

      if (!itemForm.name.trim()) {
        toast({
          title: 'Validation Error', 
          description: 'Item name is required',
          variant: 'destructive',
        })
        return
      }

      // Check if code already exists
      const { data: existingItem, error: checkError } = await supabase
        .from('catalog_items')
        .select('id')
        .eq('code', itemForm.code.trim())
        .maybeSingle()

      if (checkError) throw checkError

      if (existingItem) {
        toast({
          title: 'Duplicate Code',
          description: `Item with code "${itemForm.code}" already exists`,
          variant: 'destructive',
        })
        return
      }

      const itemData = {
        ...itemForm,
        code: itemForm.code.trim(),
        name: itemForm.name.trim(),
        last_purchase_price: itemForm.last_purchase_price ? parseFloat(itemForm.last_purchase_price) : null,
        min_order_quantity: parseFloat(itemForm.min_order_quantity),
        lead_time_days: parseInt(itemForm.lead_time_days),
        keywords: itemForm.keywords ? itemForm.keywords.split(',').map(k => k.trim()) : null,
        category_id: itemForm.category_id || null,
        default_supplier_id: itemForm.default_supplier_id || null,
      }

      const { error } = await supabase
        .from('catalog_items')
        .insert(itemData)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Catalog item created successfully',
      })

      setShowAddItem(false)
      setItemForm({
        code: '', name: '', description: '', category_id: '', default_unit: '',
        default_supplier_id: '', last_purchase_price: '', min_order_quantity: '1',
        lead_time_days: '0', keywords: '', is_active: true
      })
      loadData()
    } catch (error) {
      console.error('Error adding item:', error)
      
      // Handle specific error types
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23505') {
          toast({
            title: 'Duplicate Code',
            description: 'An item with this code already exists. Please use a different code.',
            variant: 'destructive',
          })
          return
        }
      }
      
      toast({
        title: 'Error',
        description: 'Failed to create catalog item',
        variant: 'destructive',
      })
    }
  }

  const handleAddCategory = async () => {
    try {
      const categoryData = {
        ...categoryForm,
        parent_id: categoryForm.parent_id || null,
        sort_order: categories.length
      }

      const { error } = await supabase
        .from('item_categories')
        .insert(categoryData)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Category created successfully',
      })

      setShowAddCategory(false)
      setCategoryForm({
        name: '', description: '', code: '', parent_id: '', is_active: true
      })
      loadData()
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: 'Error',
        description: 'Failed to create category',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('catalog_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      })

      loadData()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      })
    }
  }

  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || item.category_id === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue" }: {
    title: string
    value: string | number
    subtitle?: string
    icon: any
    color?: string
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Catalog Management</h1>
        <p className="text-gray-600 mt-2">
          Manage the master catalog of items available for purchase orders
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Items"
          value={stats.totalItems}
          subtitle={`${stats.totalItems - stats.activeItems} inactive`}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Active Items"
          value={stats.activeItems}
          subtitle={`${((stats.activeItems / Math.max(stats.totalItems, 1)) * 100).toFixed(1)}% active`}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Categories"
          value={stats.categories}
          icon={FolderTree}
          color="purple"
        />
        <StatsCard
          title="Suppliers"
          value={stats.suppliers}
          icon={Building}
          color="orange"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Catalog Items</CardTitle>
                  <CardDescription>
                    Manage items available for purchase orders
                  </CardDescription>
                </div>
                <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Catalog Item</DialogTitle>
                      <DialogDescription>
                        Create a new item in the catalog
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="code">Item Code</Label>
                          <Input
                            id="code"
                            value={itemForm.code}
                            onChange={(e) => setItemForm(prev => ({ ...prev, code: e.target.value }))}
                            placeholder="ITEM-001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={itemForm.name}
                            onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Item name"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={itemForm.description}
                          onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Item description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select value={itemForm.category_id} onValueChange={(value) => setItemForm(prev => ({ ...prev, category_id: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="unit">Default Unit</Label>
                          <Input
                            id="unit"
                            value={itemForm.default_unit}
                            onChange={(e) => setItemForm(prev => ({ ...prev, default_unit: e.target.value }))}
                            placeholder="unit, kg, m2, etc."
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="price">Last Purchase Price</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={itemForm.last_purchase_price}
                            onChange={(e) => setItemForm(prev => ({ ...prev, last_purchase_price: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="minQty">Min Order Qty</Label>
                          <Input
                            id="minQty"
                            type="number"
                            value={itemForm.min_order_quantity}
                            onChange={(e) => setItemForm(prev => ({ ...prev, min_order_quantity: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="leadTime">Lead Time (days)</Label>
                          <Input
                            id="leadTime"
                            type="number"
                            value={itemForm.lead_time_days}
                            onChange={(e) => setItemForm(prev => ({ ...prev, lead_time_days: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                        <Input
                          id="keywords"
                          value={itemForm.keywords}
                          onChange={(e) => setItemForm(prev => ({ ...prev, keywords: e.target.value }))}
                          placeholder="concrete, steel, lumber"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddItem(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddItem}>
                        Create Item
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Items Table */}
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="p-3 text-left font-medium">Code</th>
                        <th className="p-3 text-left font-medium">Name</th>
                        <th className="p-3 text-left font-medium">Category</th>
                        <th className="p-3 text-left font-medium">Unit</th>
                        <th className="p-3 text-left font-medium">Last Price</th>
                        <th className="p-3 text-left font-medium">Status</th>
                        <th className="p-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-mono text-sm">{item.code}</td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {item.category?.name && (
                              <Badge variant="outline">{item.category.name}</Badge>
                            )}
                          </td>
                          <td className="p-3 text-sm">{item.default_unit || '-'}</td>
                          <td className="p-3 text-sm">
                            {item.last_purchase_price ? `$${item.last_purchase_price.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3">
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Organize catalog items into categories
                  </CardDescription>
                </div>
                <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                      <DialogDescription>
                        Create a new category for organizing items
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="categoryName">Name</Label>
                        <Input
                          id="categoryName"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Category name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryCode">Code</Label>
                        <Input
                          id="categoryCode"
                          value={categoryForm.code}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="CAT-001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryDescription">Description</Label>
                        <Textarea
                          id="categoryDescription"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Category description"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddCategory(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddCategory}>
                        Create Category
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="p-3 text-left font-medium">Code</th>
                        <th className="p-3 text-left font-medium">Name</th>
                        <th className="p-3 text-left font-medium">Description</th>
                        <th className="p-3 text-left font-medium">Status</th>
                        <th className="p-3 text-left font-medium">Items Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => {
                        const itemCount = catalogItems.filter(item => item.category_id === category.id).length
                        return (
                          <tr key={category.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-mono text-sm">{category.code || '-'}</td>
                            <td className="p-3 font-medium">{category.name}</td>
                            <td className="p-3 text-sm text-gray-600">{category.description || '-'}</td>
                            <td className="p-3">
                              <Badge variant={category.is_active ? "default" : "secondary"}>
                                {category.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{itemCount} items</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>
                Manage supplier information for catalog items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="p-3 text-left font-medium">Name</th>
                        <th className="p-3 text-left font-medium">Items Count</th>
                        <th className="p-3 text-left font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map((supplier) => {
                        const itemCount = catalogItems.filter(item => item.default_supplier_id === supplier.id).length
                        return (
                          <tr key={supplier.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{supplier.name}</td>
                            <td className="p-3 text-sm">{itemCount} items</td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(supplier.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}