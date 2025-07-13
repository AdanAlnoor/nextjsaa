import { 
  FolderOpen, 
  Calendar,
  List,
  CheckSquare,
  ChevronDown,
  Search,
  Filter,
  Type,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Activity,
  GitBranch,
  Bell,
  FileText,
  Settings
} from 'lucide-react'
import { RouteConfig } from '@/types/routes'

export const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    layout: 'default',
    title: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    path: '/projects',
    layout: 'default',
    title: 'Projects',
    icon: FolderOpen
  },
  {
    path: '/analytics',
    layout: 'default',
    title: 'Analytics',
    icon: BarChart3,
    children: [
      {
        path: '/analytics/dashboard',
        layout: 'default',
        title: 'Analytics Dashboard',
        icon: BarChart3
      },
      {
        path: '/analytics/variance',
        layout: 'default',
        title: 'Variance Analysis',
        icon: TrendingUp
      },
      {
        path: '/analytics/forecasting',
        layout: 'default',
        title: 'Forecasting',
        icon: Activity
      }
    ]
  },
  {
    path: '/workflows',
    layout: 'default',
    title: 'Workflows',
    icon: GitBranch,
    children: [
      {
        path: '/workflows/dashboard',
        layout: 'default',
        title: 'Workflow Dashboard',
        icon: GitBranch
      },
      {
        path: '/workflows/approvals',
        layout: 'default',
        title: 'Approvals',
        icon: CheckSquare
      },
      {
        path: '/workflows/notifications',
        layout: 'default',
        title: 'Notifications',
        icon: Bell
      }
    ]
  },
  {
    path: '/reporting',
    layout: 'default',
    title: 'Reporting',
    icon: FileText,
    children: [
      {
        path: '/reporting/dashboard',
        layout: 'default',
        title: 'Reports Dashboard',
        icon: FileText
      },
      {
        path: '/reporting/executive',
        layout: 'default',
        title: 'Executive Dashboard',
        icon: BarChart3
      }
    ]
  },
  {
    path: '/integration',
    layout: 'default',
    title: 'Integration',
    icon: Settings,
    children: [
      {
        path: '/integration/dashboard',
        layout: 'default',
        title: 'Integration Dashboard',
        icon: Settings
      },
      {
        path: '/integration/systems',
        layout: 'default',
        title: 'System Connections',
        icon: Settings
      }
    ]
  },
  {
    path: '/all-items',
    layout: 'filter',
    title: 'All Items',
    icon: List
  },
  {
    path: '/calendar',
    layout: 'default',
    title: 'Calendar',
    icon: Calendar
  },
  {
    path: '/select',
    layout: 'filter',
    title: 'Select',
    icon: CheckSquare
  },
  {
    path: '/collapse-all',
    layout: 'default',
    title: 'Collapse All',
    icon: ChevronDown
  },
  {
    path: '/search',
    layout: 'filter',
    title: 'Search',
    icon: Search
  },
  {
    path: '/status-filter',
    layout: 'filter',
    title: 'Status Filter',
    icon: Filter
  },
  {
    path: '/type-filter',
    layout: 'filter',
    title: 'Type Filter',
    icon: Type
  }
] 