import { createClient } from "@/shared/lib/supabase/client"
import { Database } from "@/shared/types/supabase"

// Type definitions from database schema
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

class ProjectService {
  private supabase = createClient()

  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects:', error)
        throw new Error(`Failed to fetch projects: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getProjects:', error)
      throw error
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        console.error('Error fetching project by ID:', error)
        throw new Error(`Failed to fetch project ${id}: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getProjectById:', error)
      throw error
    }
  }

  async createProject(project: ProjectInsert): Promise<Project> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .insert(project)
        .select()
        .single()

      if (error) {
        console.error('Error creating project:', error)
        throw new Error(`Failed to create project: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in createProject:', error)
      throw error
    }
  }

  async updateProject(id: string, updates: ProjectUpdate): Promise<Project> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating project:', error)
        throw new Error(`Failed to update project ${id}: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in updateProject:', error)
      throw error
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting project:', error)
        throw new Error(`Failed to delete project ${id}: ${error.message}`)
      }
    } catch (error) {
      console.error('Error in deleteProject:', error)
      throw error
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService()