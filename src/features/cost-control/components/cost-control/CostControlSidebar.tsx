'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database } from '@/shared/types/supabase'
import { 
  FileText, 
  Receipt, 
  DollarSign, 
  CheckSquare, 
  List,
  Briefcase
} from 'lucide-react'

type Project = Database['public']['Tables']['projects']['Row']

interface CostControlSidebarProps {
  project: Project
}

export function CostControlSidebar({ project }: CostControlSidebarProps) {
  const pathname = usePathname()
  const baseUrl = `/projects/${project.id}/cost-control`
  
  const isActive = (path: string) => {
    return pathname === `${baseUrl}${path}` || 
      (path === '' && pathname === baseUrl)
  }

  const navItems = [
    { name: 'Summary', icon: FileText, path: '' },
    { name: 'Purchase Works', icon: Briefcase, path: '/purchase-works' },
    { name: 'Bills', icon: Receipt, path: '/bills' },
    { name: 'Wages', icon: DollarSign, path: '/wages' },
    { name: 'Work Done', icon: CheckSquare, path: '/work-done' },
    { name: 'Cost Items', icon: List, path: '/cost-items' },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto shadow-sm">
      <div className="py-6">
        <div className="px-6 mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Cost Management
          </h3>
        </div>
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.name}
                href={`${baseUrl}${item.path}`}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors relative ${
                  active
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full" aria-hidden="true" />
                )}
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className="truncate">{item.name}</span>
                {item.name === 'Bills' && (
                  <span className="ml-auto bg-primary-100 text-primary-800 py-0.5 px-2 rounded-full text-xs font-medium">
                    3
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        
        <div className="mt-8 px-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-800 mb-1">Project Budget</h4>
            <p className="text-2xl font-bold text-gray-900">
              KSh 716,489
            </p>
            <div className="mt-1 text-xs font-medium text-green-600">
              +18.3% from estimate
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 