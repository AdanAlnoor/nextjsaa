'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { UserNav } from "@/shared/components/navigation/UserNav"
import { 
  MoreHorizontal, 
  PlusCircle, 
  Loader2, 
  Building, 
  Calendar, 
  ClipboardList, 
  Plus, 
  Search, 
  ArrowRight as ArrowRightIcon, 
  Pencil, 
  Trash2,
  CheckSquare,
  Download,
  ChevronUp,
  ChevronDown,
  Filter,
  SlidersHorizontal,
  CalendarIcon,
  XCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Share2,
  LayoutGrid,
  LayoutList,
  Kanban
} from "lucide-react"
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Terminal } from "lucide-react"
import { BentoGrid, BentoCard } from "@/shared/components/ui/bento-grid"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { SkeletonTable } from "@/shared/components/ui/skeleton-table-row"
import { 
  Project, 
  getProjects, 
  createProject, 
  deleteProject,
  subscribeToProjects,
  FetchProjectsOptions 
} from '@/features/projects/services/projectService'

// Add status filter options
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Lead', label: 'Lead' },
];

// Simplified projects page to avoid hydration issues
export default function ProjectsPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/shared/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      
      try {
        const projectsResponse = await getProjects()
        setProjects(projectsResponse)
      } catch (error) {
        console.error('Error loading projects:', error)
        toast.error('Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      init()
    }
  }, [router, mounted])

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {projects.map((project) => (
          <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {project.name}
              </CardTitle>
              <Badge variant="secondary">
                {project.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.name}</div>
              <p className="text-xs text-muted-foreground">
                Created {format(parseISO(project.created_at), 'MMM dd, yyyy')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}