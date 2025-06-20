import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ProjectLayout from '@/components/layouts/ProjectLayout'
import { Suspense } from 'react'
import { getProjectById } from '@/lib/api'
import { Database } from '@/types/supabase'
import { BQTabs } from '@/components/bq/BQTabs'

type Project = Database['public']['Tables']['projects']['Row']

// Simple Error Fallback Component
function ErrorFallback({ message }: { message: string }) {
  return (
    <div className="p-4 text-center text-red-600">
      <p>Error: {message}</p>
    </div>
  );
}

export default async function BQPage({ params, searchParams }: { params: { id: string }, searchParams: { tab?: string } }) {
  const projectId = params.id;

  if (!projectId) {
    console.error('No project ID provided');
    return <ErrorFallback message="No project ID provided" />;
  }

  let project: Project | null = null;
  try {
    project = await getProjectById(projectId);

    if (!project) {
      console.error('Project not found:', projectId);
      notFound();
    }

    console.log('Project data loaded successfully for BQ page:', project.name);
    const activeTab = searchParams.tab || 'estimate';

    return (
      <ProjectLayout project={project}>
        <Suspense fallback={
          <div className="p-4 flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4"></div>
              <p>Loading BQ data...</p>
            </div>
          </div>
        }>
          <BQTabs project={project} activeTab={activeTab} />
        </Suspense>
      </ProjectLayout>
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while loading BQ page';
    console.error('Error in BQPage server component:', error);
    // If project data failed to load, we might not be able to render ProjectLayout
    // Return a simple error message instead
    return <ErrorFallback message={errorMessage} />;
  }
} 