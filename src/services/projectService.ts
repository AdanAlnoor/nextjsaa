import { createClient } from '@/utils/supabase/client';

export interface Project {
  id: string;
  name: string;
  client: string | null;
  status: string;
  created_at: string;
  project_number: string | null;
  address: string | null;
  project_type: string | null;
  start_date: string | null;
  end_date: string | null;
  area: number | null;
  unit: string | null;
  price: number | null;
  project_color: string | null;
  notes: string | null;
}

export interface ProjectsResponse {
  data: Project[];
  count: number | null;
}

export interface ProjectFilters {
  status?: string;
  client?: string;
  search?: string;
  dateRange?: { start: string; end: string };
  project_type?: string;
}

export interface FetchProjectsOptions {
  page?: number;
  pageSize?: number;
  filters?: ProjectFilters;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Fetches projects with optional pagination, filtering, and sorting
 */
export const getProjects = async (options?: FetchProjectsOptions): Promise<ProjectsResponse> => {
  const supabase = createClient();
  const pageSize = options?.pageSize || 20;
  const page = options?.page || 1;
  
  let query = supabase
    .from('projects')
    .select('*', { count: 'exact' });
  
  // Apply filters
  if (options?.filters) {
    const { status, client, search, dateRange, project_type } = options.filters;
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (client) {
      query = query.eq('client', client);
    }
    
    if (project_type) {
      query = query.eq('project_type', project_type);
    }
    
    if (dateRange) {
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,project_number.ilike.%${search}%,client.ilike.%${search}%`);
    }
  }
  
  // Apply sorting
  if (options?.sortBy) {
    const direction = options.sortDirection || 'desc';
    query = query.order(options.sortBy, { ascending: direction === 'asc' });
  } else {
    // Default sorting
    query = query.order('created_at', { ascending: false });
  }
  
  // Apply pagination
  if (page && pageSize) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
  
  return { data: data || [], count };
};

/**
 * Sets up a real-time subscription to projects table changes
 * @param callback Function to call when projects are updated
 * @param filters Optional filters to apply to the subscription
 * @returns A function to unsubscribe from the real-time updates
 */
export const subscribeToProjects = (
  callback: (payload: { new: Project; old: Project; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void,
  filters?: {
    status?: string;
    ids?: string[];
  }
) => {
  const supabase = createClient();
  
  let channel = supabase
    .channel('projects-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'projects',
        ...(filters?.status ? { filter: `status=eq.${filters.status}` } : {}),
        ...(filters?.ids && filters.ids.length > 0 ? { filter: `id=in.(${filters.ids.join(',')})` } : {})
      },
      (payload) => {
        callback(payload as any);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Fetches a single project by ID
 */
export const getProjectById = async (id: string): Promise<Project> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching project ${id}:`, error);
    throw error;
  }
  
  return data as Project;
};

/**
 * Creates a new project with the given data
 */
export const createProject = async (projectData: Partial<Project>, userId: string): Promise<Project> => {
  const supabase = createClient();
  
  // Insert the project
  const { data: newProject, error: insertError } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();
  
  if (insertError) {
    console.error('Error creating project:', insertError);
    throw insertError;
  }
  
  // Add current user as owner
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: newProject.id,
      user_id: userId,
      role: 'owner'
    });
  
  if (memberError) {
    console.error('Error adding project member:', memberError);
    throw memberError;
  }
  
  return newProject as Project;
};

/**
 * Deletes a project and its members
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  const supabase = createClient();
  
  // Delete project members first (due to foreign key constraints)
  const { error: memberError } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId);
  
  if (memberError) {
    console.error('Error deleting project members:', memberError);
    // Continue with project deletion anyway
  }
  
  // Delete the project
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  
  if (deleteError) {
    console.error('Error deleting project:', deleteError);
    throw deleteError;
  }
}; 