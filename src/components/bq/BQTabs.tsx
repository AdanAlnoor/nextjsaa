'use client'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Database } from '@/types/supabase'
import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary'

// Dynamically import EstimateTab with error handling
const EstimateTab = dynamic(
  () => import('./EstimateTab').then(mod => ({ default: mod.EstimateTab })),
  { 
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2">Loading estimate data...</span>
      </div>
    ),
    ssr: false // Disable SSR for this component to avoid hydration issues
  }
)

type Project = Database['public']['Tables']['projects']['Row']

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Error caught by error boundary:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-4 text-red-500">
        <h3 className="text-lg font-medium">Something went wrong</h3>
        <p>There was an error loading this component. Please try refreshing the page.</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function BQTabs({ project, activeTab = 'estimate' }: { project: Project, activeTab?: string }) {
  const router = useRouter()
  
  // Redirect to the cost-control page if that tab is selected
  useEffect(() => {
    if (activeTab === 'cost-control') {
      router.push(`/projects/${project.id}/cost-control`)
    }
  }, [activeTab, project.id, router])
  
  // If the activeTab is cost-control, don't render anything as we're about to redirect
  if (activeTab === 'cost-control') {
    return null
  }
  
  return (
    <ChunkErrorBoundary>
      <Tabs value={activeTab} className="h-full flex flex-col">
        {/* Content Area */}
        <div className="flex-1 min-h-0">
          <TabsContent value="estimate" className="h-full m-0 border-none outline-none">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <span className="ml-2">Loading estimate data...</span>
                </div>
              }>
                <EstimateTab project={project} />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
          <TabsContent value="proposal" className="h-full m-0 border-none outline-none">
            <div className="h-full flex items-center justify-center text-foreground">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2 text-indigo-600 dark:text-indigo-400">Daily Log</h3>
                <p className="text-muted-foreground">This feature is under development</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="program" className="h-full m-0 border-none outline-none">
            <div className="h-full flex items-center justify-center text-foreground">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2 text-indigo-600 dark:text-indigo-400">Program</h3>
                <p className="text-muted-foreground">This feature is under development</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="financial" className="h-full m-0 border-none outline-none">
            <div className="h-full flex items-center justify-center text-foreground">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2 text-indigo-600 dark:text-indigo-400">Financial Appraisal</h3>
                <p className="text-muted-foreground">This feature is under development</p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </ChunkErrorBoundary>
  )
} 