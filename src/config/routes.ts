import { 
  FolderOpen, 
  Calendar,
  List,
  CheckSquare,
  ChevronDown,
  Search,
  Filter,
  Type,
  LayoutDashboard
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