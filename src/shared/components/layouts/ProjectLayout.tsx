'use client'

import { Database } from '@/shared/types/supabase'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ThemeToggle } from '@/shared/components/common/theme-toggle'

type Project = Database['public']['Tables']['projects']['Row']

export default function ProjectLayout({ 
  project,
  children 
}: { 
  project: Project
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Set activeTab based on the current path or search params
  let activeTab = searchParams.get('tab') || 'estimate'
  
  // If we're on the cost-control page, set the active tab accordingly
  if (pathname.includes('/cost-control')) {
    activeTab = 'cost-control'
  }

  const handleTabChange = (value: string) => {
    if (value === 'cost-control') {
      router.push(`/projects/${project.id}/cost-control`)
    } else {
      router.push(`/projects/${project.id}/bq?tab=${value}`)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="flex-shrink-0 border-b border-border">
        <div className="flex h-16 items-center gap-4 px-4">
          <Link 
            href="/projects"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">
                {project.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{project.id}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full">
              <TabsList>
                <TabsTrigger value="estimate">Estimate</TabsTrigger>
                <TabsTrigger value="cost-control">Cost Control</TabsTrigger>
                <TabsTrigger value="proposal">Daily Log</TabsTrigger>
                <TabsTrigger value="program">Program</TabsTrigger>
                <TabsTrigger value="financial">Financial Appraisal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-auto">
        {children}
      </main>
    </div>
  )
} 