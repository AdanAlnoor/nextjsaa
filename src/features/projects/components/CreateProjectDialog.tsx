"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectService, type ProjectInsert } from "../services/projectService"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    project_number: "",
    client: "",
    status: "Active" as const
  })

  const queryClient = useQueryClient()

  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectInsert) => projectService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setOpen(false)
      setFormData({ name: "", project_number: "", client: "", status: "Active" })
    },
    onError: (error) => {
      console.error("Error creating project:", error)
      // TODO: Add proper error handling with toast notifications
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.project_number) {
      return
    }

    createProjectMutation.mutate({
      name: formData.name,
      project_number: formData.project_number,
      client: formData.client || null,
      status: formData.status
    })
  }

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to start tracking costs and estimates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange("name")}
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project_number">Project Number *</Label>
              <Input
                id="project_number"
                value={formData.project_number}
                onChange={handleChange("project_number")}
                placeholder="e.g., PRJ-2024-001"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={handleChange("client")}
                placeholder="Client name (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createProjectMutation.isPending || !formData.name || !formData.project_number}
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}