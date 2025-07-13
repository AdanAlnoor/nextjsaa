'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
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
import { Plus, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function NewProjectDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nextProjectId, setNextProjectId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    projectType: 'New home',
    status: 'Lead',
    address: '',
    client: '',
    calendar: 'Default',
    projectColor: 'Blue Shade',
    startDate: '',
    endDate: '',
    notes: '',
    price: '',
    area: '',
    unit: 'sq meters'
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchNextProjectId()
    }
  }, [open])

  const fetchNextProjectId = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setNextProjectId('PR-001')
          return
        }
        throw error
      }

      const match = data.id.match(/PR-(\d{3})/)
      if (!match) {
        setNextProjectId('PR-001')
        return
      }

      const lastNumber = parseInt(match[1])
      const nextNumber = lastNumber + 1
      const nextId = `PR-${String(nextNumber).padStart(3, '0')}`
      setNextProjectId(nextId)
    } catch (error) {
      console.error('Error fetching next project ID:', error)
      setNextProjectId('PR-001')
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const projectData = {
        id: nextProjectId,
        name: formData.name,
        project_type: formData.projectType,
        status: formData.status,
        address: formData.address || null,
        client: formData.client || null,
        calendar: formData.calendar || null,
        project_color: formData.projectColor || null,
        start_date: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        notes: formData.notes || null,
        price: formData.price ? Number(formData.price) : null,
        area: formData.area ? Number(formData.area) : null,
        unit: formData.unit || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('Attempting to insert project data:', projectData)

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      console.log('Successfully created project:', data)
      toast.success('Project created successfully')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error('Detailed error:', error)
      toast.error(
        error.message || 
        error.details || 
        error.hint || 
        'Failed to create project'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">GENERAL INFO</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID*</Label>
                <Input
                  id="projectId"
                  value={nextProjectId}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type</Label>
                <Select value={formData.projectType} onValueChange={(value) => handleChange('projectType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New home">New home</SelectItem>
                    <SelectItem value="Renovation">Renovation</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Enter job site address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={formData.client} onValueChange={(value) => handleChange('client', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client1">Client 1</SelectItem>
                    <SelectItem value="client2">Client 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calendar">Calendar</Label>
                <Select value={formData.calendar} onValueChange={(value) => handleChange('calendar', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Default">Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectColor">Project color</Label>
                <Select value={formData.projectColor} onValueChange={(value) => handleChange('projectColor', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Blue Shade">Blue Shade</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">ADDITIONAL INFO</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Enter project notes"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5">Ksh</span>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="pl-12"
                    placeholder="Enter contract rate"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  type="number"
                  value={formData.area}
                  onChange={(e) => handleChange('area', e.target.value)}
                  placeholder="Enter the area"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => handleChange('unit', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq meters">sq meters</SelectItem>
                    <SelectItem value="sq feet">sq feet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 