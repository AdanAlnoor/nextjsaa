import { LucideIcon } from 'lucide-react'

export type RouteConfig = {
  path: string;
  layout: 'default' | 'dashboard' | 'filter';
  title: string;
  icon?: LucideIcon;
  children?: RouteConfig[];
} 