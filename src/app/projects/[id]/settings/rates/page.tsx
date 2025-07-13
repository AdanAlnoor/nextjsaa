/**
 * Project Rates Settings Page
 * Phase 1: Project-Specific Pricing Services
 * 
 * Integration page for project rate management within project settings.
 * Provides full access to the ProjectRatesManager component with proper
 * project context and navigation.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/server';
import { ProjectRatesManager } from '@/features/library/components/rates/ProjectRatesManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { DollarSign, Settings } from 'lucide-react';

interface ProjectRatesPageProps {
  params: { 
    id: string;
  };
}

// Loading component for the rates manager
function RatesManagerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Statistics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function ProjectRatesContent({ projectId }: { projectId: string }) {
  const supabase = createClient();

  // Get project details and verify access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      project_members!inner(
        user_id,
        role
      )
    `)
    .eq('id', projectId)
    .eq('project_members.user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const userRole = project.project_members[0]?.role;
  const canEdit = ['owner', 'admin'].includes(userRole);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Project Rate Management</h1>
        </div>
        <p className="text-muted-foreground">
          Manage custom material, labour, and equipment rates for {project.name}
        </p>
      </div>

      {/* Access Control Notice */}
      {!canEdit && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Settings className="w-5 h-5" />
              <div>
                <p className="font-medium">Read-Only Access</p>
                <p className="text-sm">
                  You can view project rates but cannot make changes. Contact a project admin for edit access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Rates Manager */}
      <ProjectRatesManager
        projectId={projectId}
        projectName={project.name}
        readOnly={!canEdit}
        onRatesUpdate={() => {
          // Could trigger any additional updates needed
          // For example, invalidating cached estimates or notifying other users
        }}
      />

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About Project Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Custom Rates Override Catalog</h4>
              <p className="text-sm text-muted-foreground">
                When you set custom rates for materials, labour, or equipment, they will be used 
                instead of the standard catalog rates for all estimates in this project.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Historical Tracking</h4>
              <p className="text-sm text-muted-foreground">
                All rate changes are tracked with timestamps and effective dates. 
                You can view the complete history and see what rates were used for past estimates.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Import from Similar Projects</h4>
              <p className="text-sm text-muted-foreground">
                Save time by importing rates from completed projects with similar scope. 
                You can choose which categories to import and how to handle conflicts.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Automatic Integration</h4>
              <p className="text-sm text-muted-foreground">
                Custom rates automatically apply to new estimates and factor calculations. 
                Existing estimates continue to use the rates that were active when they were created.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectRatesPage({ params }: ProjectRatesPageProps) {
  return (
    <Suspense fallback={<RatesManagerSkeleton />}>
      <ProjectRatesContent projectId={params.id} />
    </Suspense>
  );
}

// Metadata for the page
export async function generateMetadata({ params }: ProjectRatesPageProps) {
  const supabase = createClient();
  
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', params.id)
      .single();

    return {
      title: `Rate Management - ${project?.name || 'Project'}`,
      description: 'Manage custom project-specific rates for materials, labour, and equipment'
    };
  } catch {
    return {
      title: 'Project Rate Management',
      description: 'Manage custom project-specific rates'
    };
  }
}