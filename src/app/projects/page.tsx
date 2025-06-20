'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MoreHorizontal, 
  PlusCircle, 
  LogOut, 
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
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns' // For date formatting/handling
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error display
import { Terminal } from "lucide-react"; // Icon for error alert
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid" // Import BentoGrid components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createClient } from '@/utils/supabase/client'
import { SkeletonTable } from "@/components/ui/skeleton-table-row"
import { 
  Project, 
  getProjects, 
  createProject, 
  deleteProject,
  subscribeToProjects,
  FetchProjectsOptions 
} from '@/services/projectService'

// Add status filter options
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Lead', label: 'Lead' },
];

// New: Project type options
const PROJECT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Industrial', label: 'Industrial' },
  { value: 'Infrastructure', label: 'Infrastructure' },
];

// Date presets for quick filtering
const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' }
];

// StatsCard component for showing key metrics
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  color: "blue" | "green" | "amber" | "purple" | "pink";
}

const StatsCard = ({ title, value, icon, trend = 0, color }: StatsCardProps) => {
  const colorMap = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-200 dark:border-blue-800",
    green: "from-green-500/20 to-green-600/5 border-green-200 dark:border-green-800",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-200 dark:border-amber-800",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-200 dark:border-purple-800",
    pink: "from-pink-500/20 to-pink-600/5 border-pink-200 dark:border-pink-800",
  };

  const iconColorMap = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    pink: "text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30",
  };

  const trendColorMap = {
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-gray-600 dark:text-gray-400",
  };

  const trendType = trend > 0 ? "positive" : trend < 0 ? "negative" : "neutral";
  const trendIcon = trend > 0 ? <ChevronUp className="h-3 w-3" /> : trend < 0 ? <ChevronDown className="h-3 w-3" /> : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative backdrop-blur-md bg-white/60 dark:bg-gray-900/60 rounded-xl border ${colorMap[color]} shadow-lg overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-50`}></div>
      <div className="relative p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <div className="flex items-baseline mt-1">
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {trend !== 0 && (
              <span className={`ml-2 text-xs font-medium flex items-center ${trendColorMap[trendType]}`}>
                {trendIcon} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${iconColorMap[color]}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

// ProjectCard component for grid view
interface ProjectCardProps {
  project: Project;
  onSelect: (id: string, e: React.MouseEvent) => void;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const ProjectCard = ({ project, onSelect, isSelected, onClick }: ProjectCardProps) => {
  const statusColorMap = {
    'Completed': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-800',
    'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800',
    'Lead': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800',
  };

  const statusIconMap = {
    'Completed': <CheckCircle className="h-4 w-4" />,
    'In Progress': <Clock className="h-4 w-4" />,
    'Lead': <Users className="h-4 w-4" />,
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative backdrop-blur-md ${isSelected ? 'bg-blue-50/80 dark:bg-blue-900/30' : 'bg-white/60 dark:bg-gray-900/60'} rounded-xl border ${isSelected ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200/50 dark:border-gray-700/50'} shadow-lg overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100/30 to-gray-200/30 dark:from-gray-800/20 dark:to-gray-900/20 opacity-50"></div>
      <div className="relative p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project.project_number}</p>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                if (checked !== 'indeterminate') {
                  onSelect(project.id, {} as React.MouseEvent);
                }
              }}
              aria-label={`Select project ${project.name}`}
              className="mr-2"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onClick(project.id)}>View Details</DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/projects/${project.id}/edit`;
                }}>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 dark:text-red-400">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client</p>
            <p className="text-sm font-medium">{project.client || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date Created</p>
            <p className="text-sm font-medium">{format(new Date(project.created_at), 'PP')}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <Badge className={`px-2.5 py-0.5 flex items-center gap-1 ${statusColorMap[project.status as keyof typeof statusColorMap]}`}>
            {statusIconMap[project.status as keyof typeof statusIconMap]}
            {project.status}
          </Badge>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                    onClick={() => onClick(project.id)}
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>View Project</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onClick(project.id)}
                  className="flex items-center gap-2"
                >
                  <ArrowRightIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>View Project</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/projects/${project.id}/edit`;
                  }}
                  className="flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Edit Project</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [newProjectType, setNewProjectType] = useState('Residential');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Add state for view type (table, grid, kanban)
  const [viewType, setViewType] = useState<'table' | 'grid' | 'kanban'>('table');
  
  // Enhanced state for sorting, filtering, and selection
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // New: Date range filtering
  const [datePreset, setDatePreset] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null}>({
    start: null,
    end: null
  });
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  
  // State to track real-time updates that arrived while in a different page
  const [pendingUpdates, setPendingUpdates] = useState(false);
  
  // Track if filter has been applied
  const hasActiveFilters = useMemo(() => {
    return statusFilter !== 'all' || 
           projectTypeFilter !== 'all' || 
           datePreset !== 'all' || 
           debouncedSearchTerm !== '';
  }, [statusFilter, projectTypeFilter, datePreset, debouncedSearchTerm]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle date preset changes
  useEffect(() => {
    if (datePreset === 'all') {
      setDateRange({ start: null, end: null });
    } else if (datePreset === 'this-month') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      setDateRange({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      });
    } else if (datePreset === 'last-month') {
      const lastMonth = subMonths(new Date(), 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      setDateRange({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      });
    } else if (datePreset === 'last-3-months') {
      const threeMonthsAgo = subMonths(new Date(), 3);
      setDateRange({
        start: format(threeMonthsAgo, 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      });
    } else if (datePreset === 'custom') {
      setDateRange(customDateRange);
    }
  }, [datePreset, customDateRange]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        router.replace('/login');
      }
    };
    
    fetchUser();
  }, [router]);

  // Set up real-time subscription to projects
  useEffect(() => {
    // Only set up subscription if user is authenticated
    if (!user) return;
    
    console.log('Setting up real-time subscription to projects table');
    
    // Subscribe to all project changes
    const unsubscribe = subscribeToProjects((payload) => {
      console.log('Received real-time update:', payload.eventType, payload.new?.id);
      
      // We need to handle the update based on the current filter/page state
      const currentQueryKey = ['projects', currentPage, pageSize, debouncedSearchTerm, sortBy, sortDirection, statusFilter, projectTypeFilter, dateRange?.start, dateRange?.end];
      const currentData = queryClient.getQueryData<{ data: Project[], count: number }>(currentQueryKey);
      
      // If we don't have cached data yet, just mark that updates are pending
      if (!currentData) {
        setPendingUpdates(true);
        return;
      }
      
      // Handle INSERT: Check if the new item matches our current filters
      if (payload.eventType === 'INSERT') {
        // If filters are active, just set the flag to indicate updates are available
        if (hasActiveFilters) {
          setPendingUpdates(true);
          return;
        }
        
        // If we're not on the first page, set flag for updates
        if (currentPage !== 1) {
          setPendingUpdates(true);
          return;
        }
        
        // Otherwise update the cached data to include the new project
        const updatedData = {
          data: [payload.new, ...currentData.data].slice(0, pageSize),
          count: (currentData.count || 0) + 1
        };
        
        queryClient.setQueryData(currentQueryKey, updatedData);
        toast.success('New project added');
      }
      
      // Handle UPDATE: Update the item in our cache if it exists
      else if (payload.eventType === 'UPDATE') {
        const updatedProjects = currentData.data.map(project => 
          project.id === payload.new.id ? payload.new : project
        );
        
        // Check if the item was actually in our current page
        const wasUpdated = updatedProjects.some(p => p.id === payload.new.id);
        
        if (wasUpdated) {
          queryClient.setQueryData(currentQueryKey, {
            ...currentData,
            data: updatedProjects
          });
          toast.success('Project updated');
        } else {
          // If the updated project isn't in our current view, notify about pending updates
          setPendingUpdates(true);
        }
      }
      
      // Handle DELETE: Remove the item from our cache if it exists
      else if (payload.eventType === 'DELETE') {
        const updatedProjects = currentData.data.filter(project => project.id !== payload.old.id);
        const wasDeleted = updatedProjects.length < currentData.data.length;
        
        if (wasDeleted) {
          queryClient.setQueryData(currentQueryKey, {
            data: updatedProjects,
            count: (currentData.count || 0) - 1
          });
          toast.success('Project deleted');
        }
      }
    });

    // Clean up subscription on unmount
    return () => {
      console.log('Cleaning up real-time subscription');
      unsubscribe();
    };
  }, [user, queryClient, currentPage, pageSize, hasActiveFilters, debouncedSearchTerm, sortBy, sortDirection, statusFilter, projectTypeFilter, dateRange?.start, dateRange?.end]);

  // Query for projects with pagination, search, and sorting
  const projectsQuery = useQuery({
    queryKey: ['projects', currentPage, pageSize, debouncedSearchTerm, sortBy, sortDirection, statusFilter, projectTypeFilter, dateRange?.start, dateRange?.end],
    queryFn: () => getProjects({
      page: currentPage,
      pageSize,
      filters: {
        ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(projectTypeFilter !== 'all' ? { project_type: projectTypeFilter } : {}),
        ...(dateRange?.start || dateRange?.end ? { 
          dateRange: { 
            start: dateRange.start || '', 
            end: dateRange.end || '' 
          } 
        } : {})
      },
      sortBy,
      sortDirection
    }),
    enabled: !!user, // Only run query if user is authenticated
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus since we use realtime
  });

  // Project creation mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { 
      name: string; 
      client: string | null; 
      project_number: string;
      status: string;
      project_type: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      return createProject(projectData, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsAddProjectDialogOpen(false);
      setNewProjectName('');
      setNewProjectClient('');
      setNewProjectType('Residential');
      toast.success('Project created successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to create project: ${error.message}`);
      console.error('Error creating project:', error);
    }
  });

  // Project deletion mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
      toast.success('Project deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete project: ${error.message}`);
      console.error('Error deleting project:', error);
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  });

  // Batch project deletion mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      const promises = projectIds.map(id => deleteProject(id));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProjects(new Set());
      setSelectAll(false);
      toast.success('Selected projects deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete projects: ${error.message}`);
      console.error('Error deleting projects:', error);
    }
  });

  // Handle adding a new project
  async function handleAddProject() {
    if (!newProjectName.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }

    // Generate a sequential project_number with PR- prefix
    try {
      const supabase = createClient();
      const { data: maxNumberData } = await supabase
        .from('projects')
        .select('project_number')
        .order('project_number', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();
      
      // Calculate the next project number with PR- prefix
      let nextProjectNumber = 'PR-001'; // Default starting number
      
      if (maxNumberData?.project_number) {
        const currentNum = maxNumberData.project_number;
        // If it's already in PR-XXX format
        if (currentNum.startsWith('PR-')) {
          const numPart = parseInt(currentNum.substring(3), 10);
          if (!isNaN(numPart)) {
            // Increment and format with leading zeros
            nextProjectNumber = `PR-${(numPart + 1).toString().padStart(3, '0')}`;
          }
        } else {
          // If it's in another format, convert and start from proper sequence
          const numPart = parseInt(currentNum, 10);
          if (!isNaN(numPart)) {
            nextProjectNumber = `PR-${(numPart + 1).toString().padStart(3, '0')}`;
          }
        }
      }

      createProjectMutation.mutate({
        name: newProjectName.trim(),
        client: newProjectClient.trim() || null,
        project_number: nextProjectNumber,
        status: 'In Progress',
        project_type: newProjectType
      });
    } catch (err: any) {
      console.error('Error generating project number:', err);
      toast.error(`Failed to generate project number: ${err.message}`);
    }
  }

  // Handler for row click to navigate to project
  const handleRowClick = (projectId: string) => {
    router.push(`/projects/${projectId}/bq`);
  };

  // Handle sorting change
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default descending order
      setSortBy(column);
      setSortDirection('desc');
    }
    // Reset to first page
    setCurrentPage(1);
  };

  // Handle row selection
  const toggleRowSelection = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjects(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(projectId)) {
        newSelected.delete(projectId);
      } else {
        newSelected.add(projectId);
      }
      return newSelected;
    });
  };

  // Handle select all
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    setSelectAll(isChecked);
    
    if (isChecked && projectsQuery.data?.data) {
      // Select all visible projects
      const allIds = projectsQuery.data.data.map(p => p.id);
      setSelectedProjects(new Set(allIds));
    } else {
      // Deselect all
      setSelectedProjects(new Set());
    }
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    if (selectedProjects.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedProjects.size} selected projects?`)) {
      batchDeleteMutation.mutate(Array.from(selectedProjects));
    }
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle project type filter change
  const handleProjectTypeFilterChange = (type: string) => {
    setProjectTypeFilter(type);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Async function to sign out the user
  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out: ' + error.message);
    } else {
      toast.success('Signed out successfully');
      router.replace('/login'); 
    }
  }

  // Function to manually refresh data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setPendingUpdates(false);
    toast.success('Projects refreshed');
  };

  // If the user is not loaded, wait for it
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // Main content when user is loaded
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 border-l-4 border-blue-500 pl-3">
            Projects
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Manage your construction projects, view estimates, bill of quantities and more.
          </p>
        </div>
        <div className="relative ml-auto flex-1 md:grow-0">
          {/* Optional Search Bar Placeholder */}
          {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search projects..." className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]" /> */}
        </div>
        <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="h-8 gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-sm transition-all duration-200 hover:shadow"
              onClick={() => setIsAddProjectDialogOpen(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Project
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
              <DialogDescription>
                Enter the details for your new project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input 
                  id="name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Name" 
                  className="col-span-3" 
                  disabled={createProjectMutation.isPending}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client" className="text-right">
                  Client
                </Label>
                <Input 
                  id="client"
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  placeholder="Client Name (optional)" 
                  className="col-span-3" 
                  disabled={createProjectMutation.isPending}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project-type" className="text-right">
                  Type
                </Label>
                <Select 
                  value={newProjectType} 
                  onValueChange={setNewProjectType}
                  disabled={createProjectMutation.isPending}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.filter(option => option.value !== 'all').map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddProjectDialogOpen(false)} disabled={createProjectMutation.isPending}>Cancel</Button>
              <Button type="button" onClick={handleAddProject} disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Project'}
              </Button> 
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
              <Avatar>
                {/* Add user avatar logic if available */}
                {/* <AvatarImage src={user.avatar_url || undefined} alt={user.email} /> */}
                <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Enhanced Filter & Search Bar */}
      <div className="flex flex-col gap-4 mb-6 px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">
                {projectsQuery.data?.count ?? 0} {(projectsQuery.data?.count === 1) ? 'Project' : 'Projects'}
              </span>
            </div>
            
            {/* Real-time updates indicator */}
            {pendingUpdates && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-1 border-dashed bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/30 animate-pulse"
                onClick={refreshData}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Data
              </Button>
            )}
            
            {/* Status filter dropdown */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-9 gap-1 ${statusFilter !== 'all' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-dashed'}`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {statusFilter === 'all' ? 'All Status' : statusFilter}
                    {statusFilter !== 'all' && (
                      <XCircle 
                        className="h-3.5 w-3.5 ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusFilter('all');
                          setCurrentPage(1);
                        }}
                      />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {STATUS_OPTIONS.map(option => (
                    <DropdownMenuItem 
                      key={option.value}
                      className={statusFilter === option.value ? "bg-muted" : ""}
                      onClick={() => {
                        setStatusFilter(option.value);
                        setCurrentPage(1);
                      }}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Project Type filter dropdown */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-9 gap-1 ${projectTypeFilter !== 'all' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-dashed'}`}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    {PROJECT_TYPE_OPTIONS.find(opt => opt.value === projectTypeFilter)?.label || 'All Types'}
                    {projectTypeFilter !== 'all' && (
                      <XCircle 
                        className="h-3.5 w-3.5 ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectTypeFilter('all');
                          setCurrentPage(1);
                        }}
                      />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Filter by Project Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PROJECT_TYPE_OPTIONS.map(option => (
                    <DropdownMenuItem 
                      key={option.value}
                      className={projectTypeFilter === option.value ? "bg-muted" : ""}
                      onClick={() => {
                        setProjectTypeFilter(option.value);
                        setCurrentPage(1);
                      }}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Date Range filter */}
            <div className="relative">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-9 gap-1 ${datePreset !== 'all' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-dashed'}`}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {DATE_PRESETS.find(d => d.value === datePreset)?.label || 'Date Range'}
                    {datePreset !== 'all' && (
                      <XCircle 
                        className="h-3.5 w-3.5 ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDatePreset('all');
                          setCurrentPage(1);
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Date Range</h4>
                      <Select 
                        value={datePreset} 
                        onValueChange={(val) => {
                          setDatePreset(val);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_PRESETS.map(preset => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {datePreset === 'custom' && (
                      <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label htmlFor="from" className="text-right">
                            From
                          </Label>
                          <Input
                            id="from"
                            className="col-span-2"
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) => {
                              setCustomDateRange(prev => ({
                                ...prev,
                                start: e.target.value
                              }));
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label htmlFor="to" className="text-right">
                            To
                          </Label>
                          <Input
                            id="to"
                            className="col-span-2"
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) => {
                              setCustomDateRange(prev => ({
                                ...prev,
                                end: e.target.value
                              }));
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Active filters:</span>
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                Status: {statusFilter}
                <XCircle 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => setStatusFilter('all')}
                />
              </Badge>
            )}
            {projectTypeFilter !== 'all' && (
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                Type: {projectTypeFilter}
                <XCircle 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => setProjectTypeFilter('all')}
                />
              </Badge>
            )}
            {datePreset !== 'all' && (
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                {DATE_PRESETS.find(d => d.value === datePreset)?.label}
                <XCircle 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => setDatePreset('all')}
                />
              </Badge>
            )}
            {debouncedSearchTerm && (
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                Search: {debouncedSearchTerm}
                <XCircle 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => setSearchTerm('')}
                />
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-0 -ml-1"
              onClick={() => {
                setStatusFilter('all');
                setProjectTypeFilter('all');
                setDatePreset('all');
                setSearchTerm('');
                setCurrentPage(1);
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Batch Operations Bar - Show when projects are selected */}
      {selectedProjects.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-y border-blue-100 dark:border-blue-800 py-2 px-6 mb-4 flex items-center justify-between">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedProjects.size} projects selected
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              className="text-blue-700 border-blue-200 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-800/30"
              onClick={() => setSelectedProjects(new Set())}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
            >
              {batchDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete Selected
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {/* Display error loading projects if it occurred */}
          {projectsQuery.isError && (
             <Alert variant="destructive" className="mb-4">
               <Terminal className="h-4 w-4" />
               <AlertTitle>Error Loading Projects</AlertTitle>
               <AlertDescription>{(projectsQuery.error as Error)?.message || 'An unexpected error occurred'}</AlertDescription>
             </Alert>
          )}

          {/* Stats Cards - Show only when we have data */}
          {(projectsQuery.data?.data?.length ?? 0) > 0 && !projectsQuery.isError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatsCard 
                title="Total Projects" 
                value={projectsQuery.data?.count || 0}
                icon={<ClipboardList className="h-5 w-5" />} 
                trend={10} 
                color="blue"
              />
              <StatsCard 
                title="In Progress" 
                value={projectsQuery.data?.data.filter(p => p.status === 'In Progress').length || 0}
                icon={<Clock className="h-5 w-5" />} 
                trend={5}
                color="amber" 
              />
              <StatsCard 
                title="Completed" 
                value={projectsQuery.data?.data.filter(p => p.status === 'Completed').length || 0}
                icon={<CheckCircle className="h-5 w-5" />}
                trend={-2} 
                color="green"
              />
              <StatsCard 
                title="Leads" 
                value={projectsQuery.data?.data.filter(p => p.status === 'Lead').length || 0}
                icon={<Users className="h-5 w-5" />}
                trend={15}
                color="purple" 
              />
            </div>
          )}

          {/* Improve the empty state */}
          {(projectsQuery.data?.data?.length ?? 0) === 0 && !projectsQuery.isError ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="col-span-full flex flex-col items-center justify-center py-16 text-center"
            >
              <motion.div 
                className="relative"
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 blur-xl rounded-full opacity-70"></div>
                <div className="relative rounded-full bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 p-4 mb-6 shadow-md">
                  <Building className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No projects found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Get started by creating your first construction project to manage estimates, bill of quantities and more.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                  onClick={() => setIsAddProjectDialogOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  <span>Create First Project</span>
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            // Multi-view project display with tabs
            <div className="col-span-full animate-in fade-in duration-500">
              <Card className="relative backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100/30 to-gray-200/30 dark:from-gray-800/20 dark:to-gray-900/20 opacity-50"></div>
                <CardHeader className="relative flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Projects</CardTitle>
                    <CardDescription>Manage your construction projects</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewType === 'table' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => setViewType('table')}
                    >
                      <LayoutList className="h-4 w-4" />
                      <span className="hidden sm:inline">Table</span>
                    </Button>
                    <Button
                      variant={viewType === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => setViewType('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Grid</span>
                    </Button>
                    <Button
                      variant={viewType === 'kanban' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                      onClick={() => setViewType('kanban')}
                    >
                      <Kanban className="h-4 w-4" />
                      <span className="hidden sm:inline">Kanban</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  {viewType === 'table' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50/80 dark:bg-gray-800/80 dark:text-gray-400 backdrop-blur-sm sticky top-0 z-10">
                          <tr>
                            <th scope="col" className="px-4 py-3 w-10">
                              <Checkbox
                                checked={selectAll}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all projects"
                              />
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 cursor-pointer"
                              onClick={() => handleSort('project_number')}
                            >
                              <div className="flex items-center">
                                Project # 
                                {sortBy === 'project_number' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 cursor-pointer"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center">
                                Name
                                {sortBy === 'name' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 cursor-pointer"
                              onClick={() => handleSort('client')}
                            >
                              <div className="flex items-center">
                                Client
                                {sortBy === 'client' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 cursor-pointer"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center">
                                Status
                                {sortBy === 'status' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 cursor-pointer"
                              onClick={() => handleSort('created_at')}
                            >
                              <div className="flex items-center">
                                Date Created
                                {sortBy === 'created_at' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectsQuery.isLoading ? (
                            <SkeletonTable rows={pageSize} columns={7} />
                          ) : (
                            <AnimatePresence>
                              {projectsQuery.data?.data.map((project, index) => (
                                <motion.tr 
                                  key={project.id}
                                  layout
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                  className={`group relative backdrop-blur-sm border-b ${
                                    selectedProjects.has(project.id) 
                                      ? 'bg-blue-50/90 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/50' 
                                      : 'bg-white/80 dark:bg-gray-900/80 border-gray-200/60 dark:border-gray-700/60'
                                  } hover:bg-gray-50/90 dark:hover:bg-gray-800/90 cursor-pointer`}
                                  onClick={(e) => {
                                    // Prevent row click if user clicked on checkbox or action buttons
                                    if ((e.target as HTMLElement).closest('button, a, input')) return;
                                    handleRowClick(project.id);
                                  }}
                                >
                                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={selectedProjects.has(project.id)}
                                      onCheckedChange={(checked) => {
                                        const newSelected = new Set(selectedProjects);
                                        if (checked) {
                                          newSelected.add(project.id);
                                        } else {
                                          newSelected.delete(project.id);
                                        }
                                        setSelectedProjects(newSelected);
                                      }}
                                      aria-label={`Select project ${project.name}`}
                                    />
                                  </td>
                                  <td className="px-6 py-4">{project.project_number || 'N/A'}</td>
                                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    {project.name}
                                  </td>
                                  <td className="px-6 py-4">{project.client || 'N/A'}</td>
                                  <td className="px-6 py-4">
                                    {project.status === 'Completed' ? (
                                      <span className="px-2.5 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800 flex items-center w-fit">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                        Completed
                                      </span>
                                    ) : project.status === 'In Progress' ? (
                                      <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800 flex items-center w-fit">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                                        In Progress
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800 flex items-center w-fit">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                                        Lead
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {format(new Date(project.created_at), 'PP')}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center">
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 overflow-hidden">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  router.push(`/projects/${project.id}/bq`);
                                                }}
                                              >
                                                <ArrowRightIcon className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                              <p>View Project</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-800/30"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  router.push(`/projects/${project.id}/edit`);
                                                }}
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                              <p>Edit Project</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-full ml-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/projects/${project.id}/bq`);
                                            }}
                                            className="flex items-center gap-2"
                                          >
                                            <ArrowRightIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <span>View Project</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/projects/${project.id}/edit`);
                                            }}
                                            className="flex items-center gap-2"
                                          >
                                            <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            <span>Edit Project</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setProjectToDelete(project);
                                              setIsDeleteDialogOpen(true);
                                            }}
                                            className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span>Delete Project</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {viewType === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                      {projectsQuery.isLoading ? (
                        // Grid view loading skeleton
                        Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                        ))
                      ) : (
                        <AnimatePresence>
                          {projectsQuery.data?.data.map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              isSelected={selectedProjects.has(project.id)}
                              onSelect={toggleRowSelection}
                              onClick={(id) => handleRowClick(id)}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  )}

                  {viewType === 'kanban' && (
                    <div className="flex overflow-x-auto gap-6 pb-4 min-h-[400px] pt-4">
                      {['Lead', 'In Progress', 'Completed'].map((status) => (
                        <div key={status} className="flex-shrink-0 w-72">
                          <div className="bg-gray-50/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-medium text-sm">
                                {status}
                                <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2 py-0.5">
                                  {projectsQuery.data?.data.filter(p => p.status === status).length || 0}
                                </span>
                              </h3>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsAddProjectDialogOpen(true)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {projectsQuery.isLoading ? (
                                // Kanban loading skeleton
                                Array.from({ length: 3 }).map((_, i) => (
                                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                                ))
                              ) : (
                                <AnimatePresence>
                                  {projectsQuery.data?.data
                                    .filter(p => p.status === status)
                                    .map((project) => (
                                      <motion.div
                                        key={project.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border border-gray-200/50 dark:border-gray-700/50 cursor-pointer"
                                        onClick={() => handleRowClick(project.id)}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <h4 className="font-medium text-sm text-gray-900 dark:text-white">{project.name}</h4>
                                          <Checkbox
                                            checked={selectedProjects.has(project.id)}
                                            onCheckedChange={(checked) => {
                                              if (checked !== 'indeterminate') {
                                                toggleRowSelection(project.id, {} as React.MouseEvent);
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`Select project ${project.name}`}
                                          />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{project.project_number}</p>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {project.client || 'No client'}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      router.push(`/projects/${project.id}/bq`);
                                                    }}
                                                  >
                                                    <ArrowRightIcon className="h-3.5 w-3.5" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                  <p className="text-xs">View Project</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                            
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      router.push(`/projects/${project.id}/edit`);
                                                    }}
                                                  >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                  <p className="text-xs">Edit Project</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        </div>
                                      </motion.div>
                                    ))}
                                </AnimatePresence>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Pagination Controls */}
                  {(projectsQuery.data?.count ?? 0) > 0 && (
                    <div className="flex flex-wrap justify-between items-center mt-6 gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          Showing {Math.min((currentPage - 1) * pageSize + 1, projectsQuery.data?.count ?? 0)} 
                          - {Math.min(currentPage * pageSize, projectsQuery.data?.count ?? 0)} 
                          of {projectsQuery.data?.count ?? 0}
                        </span>
                        
                        {/* Page size selector */}
                        <div className="flex items-center gap-2 ml-4">
                          <span>Show</span>
                          <Select 
                            value={pageSize.toString()} 
                            onValueChange={(value) => {
                              const newPageSize = parseInt(value);
                              setPageSize(newPageSize);
                              // Adjust current page to keep the user's position in the data as close as possible
                              const firstItemIndex = (currentPage - 1) * pageSize + 1;
                              const newPage = Math.max(1, Math.ceil(firstItemIndex / newPageSize));
                              setCurrentPage(newPage);
                            }}
                          >
                            <SelectTrigger className="w-16 h-8 px-2 py-0">
                              <SelectValue placeholder="10" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                          <span>per page</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Quick page navigation for smaller numbers */}
                        {(projectsQuery.data?.count ?? 0) <= pageSize * 10 ? (
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCurrentPage(1)} 
                              disabled={currentPage === 1 || projectsQuery.isLoading}
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">First page</span>
                              1
                            </Button>
                            
                            {/* Generate page buttons */}
                            {Array.from({ length: Math.min(10, Math.ceil((projectsQuery.data?.count ?? 0) / pageSize)) }).map((_, i) => {
                              const pageNum = i + 1;
                              // Only show current page, and pages around it
                              if (pageNum === 1 || pageNum === Math.ceil((projectsQuery.data?.count ?? 0) / pageSize) ||
                                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                return (
                                  <Button 
                                    key={pageNum}
                                    variant={pageNum === currentPage ? "default" : "outline"} 
                                    size="sm" 
                                    onClick={() => setCurrentPage(pageNum)} 
                                    disabled={pageNum === currentPage || projectsQuery.isLoading}
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">Page {pageNum}</span>
                                    {pageNum}
                                  </Button>
                                );
                              }
                              // Show ellipsis where we skip pages, but only once between skips
                              else if ((pageNum === currentPage - 2 && pageNum > 2) || (pageNum === currentPage + 2 && pageNum < Math.ceil((projectsQuery.data?.count ?? 0) / pageSize) - 1)) {
                                return (
                                  <Button 
                                    key={`ellipsis-${pageNum}`}
                                    variant="ghost"
                                    size="sm" 
                                    disabled={true}
                                    className="h-8 w-8 p-0"
                                  >
                                    …
                                  </Button>
                                );
                              }
                              return null;
                            })}
                            
                            {/* Last page button */}
                            {Math.ceil((projectsQuery.data?.count ?? 0) / pageSize) > 1 && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(Math.ceil((projectsQuery.data?.count ?? 0) / pageSize))} 
                                disabled={currentPage === Math.ceil((projectsQuery.data?.count ?? 0) / pageSize) || projectsQuery.isLoading}
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Last page</span>
                                {Math.ceil((projectsQuery.data?.count ?? 0) / pageSize)}
                              </Button>
                            )}
                          </div>
                        ) : (
                          // Simpler pagination for larger datasets
                          <div className="flex gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setCurrentPage(1)} 
                                    disabled={currentPage === 1 || projectsQuery.isLoading}
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">First page</span>
                                    <ChevronUp className="h-4 w-4 -rotate-90" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>First page</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                              disabled={currentPage === 1 || projectsQuery.isLoading}
                            >
                              Previous
                            </Button>
                            
                            <div className="flex items-center text-sm">
                              <span>Page</span>
                              <input
                                type="number"
                                min="1"
                                max={Math.ceil((projectsQuery.data?.count ?? 0) / pageSize)}
                                value={currentPage}
                                onChange={(e) => {
                                  const page = parseInt(e.target.value);
                                  if (!isNaN(page) && page > 0 && page <= Math.ceil((projectsQuery.data?.count ?? 0) / pageSize)) {
                                    setCurrentPage(page);
                                  }
                                }}
                                className="w-12 h-8 mx-2 text-center border rounded"
                              />
                              <span>of {Math.ceil((projectsQuery.data?.count ?? 0) / pageSize)}</span>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setCurrentPage(p => p + 1)}
                              disabled={currentPage * pageSize >= (projectsQuery.data?.count ?? 0) || projectsQuery.isLoading}
                            >
                              Next
                            </Button>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setCurrentPage(Math.ceil((projectsQuery.data?.count ?? 0) / pageSize))} 
                                    disabled={currentPage === Math.ceil((projectsQuery.data?.count ?? 0) / pageSize) || projectsQuery.isLoading}
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">Last page</span>
                                    <ChevronDown className="h-4 w-4 -rotate-90" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Last page</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
      </main>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the project <span className="font-medium">{projectToDelete?.name}</span>? 
              This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => projectToDelete && deleteProjectMutation.mutate(projectToDelete.id)}
              disabled={deleteProjectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modern Command Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-full px-4 w-full sm:w-auto sm:px-0">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex gap-2 items-center p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-full border border-gray-200 dark:border-gray-800 shadow-lg overflow-x-auto max-w-full"
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full flex items-center gap-2 whitespace-nowrap"
            onClick={refreshData}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full flex items-center gap-2 whitespace-nowrap"
            onClick={() => {
              if (viewType === 'table') {
                setViewType('grid');
              } else if (viewType === 'grid') {
                setViewType('kanban');
              } else {
                setViewType('table');
              }
            }}
          >
            {viewType === 'table' && <LayoutGrid className="h-4 w-4" />}
            {viewType === 'grid' && <Kanban className="h-4 w-4" />}
            {viewType === 'kanban' && <LayoutList className="h-4 w-4" />}
            <span className="hidden sm:inline">
              Change View
            </span>
          </Button>
          
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full flex items-center gap-2 whitespace-nowrap"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </motion.div>
      </div>

      {/* Floating Action Button */}
      <motion.div 
        className="fixed bottom-6 right-6 z-50"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button 
          size="lg" 
          className="h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30"
          onClick={() => setIsAddProjectDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  )
} 