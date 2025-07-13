import { createClient } from '@/shared/lib/supabase/server'
import { cookies } from 'next/headers'
// import { DashboardStats, Activity, Project } from '@/types/dashboard'
import { Database } from '@/shared/types/supabase'
import { AppError, handleApiError } from './error-utils'

// Function to get Supabase client in server components/actions
function getSupabaseInstance() {
  return createClient()
}

// Commented out functions using the missing types
// export async function fetchDashboardStats(): Promise<DashboardStats> {
//   const supabase = getSupabaseInstance()
//   
//   try {
//     const [usersResponse, projectsResponse, tasksResponse] = await Promise.all([
//       supabase.from('users').select('*', { count: 'exact', head: true }),
//       supabase.from('projects').select('id, status'),
//       supabase.from('tasks').select('id, status'),
//     ])
//
//     if (usersResponse.error) throw new AppError(usersResponse.error.message, 'DB_ERROR')
//     if (projectsResponse.error) throw new AppError(projectsResponse.error.message, 'DB_ERROR')
//     if (tasksResponse.error) throw new AppError(tasksResponse.error.message, 'DB_ERROR')
//
//     const activeProjects = projectsResponse.data.filter(p => p.status === 'active').length
//     const completedTasks = tasksResponse.data.filter(t => t.status === 'completed').length
//
//     return {
//       totalUsers: usersResponse.count || 0,
//       activeProjects,
//       completedTasks,
//       growthRate: await calculateGrowthRate()
//     }
//   } catch (error) {
//     console.error('Error in fetchDashboardStats:', error)
//     return {
//       totalUsers: 0,
//       activeProjects: 0,
//       completedTasks: 0,
//       growthRate: 0
//     }
//   }
// }

// export async function fetchRecentActivities(): Promise<Activity[]> {
//   const supabase = getSupabaseInstance()
//   
//   try {
//     const { data, error } = await supabase
//       .from('activities')
//       .select('*')
//       .order('created_at', { ascending: false })
//       .limit(5)
//
//     if (error) {
//       console.error('Error fetching activities:', error)
//       // Return mock data if table doesn't exist
//       return [
//         {
//           id: '1',
//           type: 'comment',
//           title: 'Left a comment on "Landing page redesign"',
//           time: '2 hours ago',
//           user: {
//             name: 'Sarah Miller',
//             avatar: '/avatars/sarah.png'
//           }
//         },
//         {
//           id: '2',
//           type: 'pull_request',
//           title: 'Created PR for feature/auth-improvements',
//           time: '5 hours ago',
//           user: {
//             name: 'John Doe',
//             avatar: '/avatars/john.png'
//           }
//         },
//         {
//           id: '3',
//           type: 'edit',
//           title: 'Updated documentation for API endpoints',
//           time: '1 day ago',
//           user: {
//             name: 'Emily Chen',
//             avatar: '/avatars/emily.png'
//           }
//         }
//       ]
//     }
//
//     return data.map(activity => ({
//       id: activity.id,
//       type: activity.type,
//       title: activity.title,
//       time: formatRelativeTime(activity.created_at),
//       user: {
//         name: activity.user_name,
//         avatar: activity.user_avatar
//       }
//     }))
//   } catch (error) {
//     console.error('Error in fetchRecentActivities:', error)
//     throw handleApiError(error)
//   }
// }

// export async function fetchRecentProjects(): Promise<Project[]> {
//   const supabase = getSupabaseInstance()
//   
//   try {
//     const { data, error } = await supabase
//       .from('projects')
//       .select(`
//         id,
//         name,
//         status,
//         updated_at
//       `)
//       .order('updated_at', { ascending: false })
//       .limit(3)
//
//     if (error) {
//       console.error('Error fetching projects:', error)
//       return [
//         {
//           id: '1',
//           name: 'Website Redesign',
//           status: 'in_progress',
//           lastUpdated: '2 days ago',
//           team: [
//             { name: 'Alex', avatar: '/avatars/alex.png' },
//             { name: 'Sarah', avatar: '/avatars/sarah.png' },
//           ]
//         },
//         {
//           id: '2',
//           name: 'Mobile App Development',
//           status: 'planned',
//           lastUpdated: '1 week ago',
//           team: [
//             { name: 'John', avatar: '/avatars/john.png' },
//             { name: 'Emily', avatar: '/avatars/emily.png' },
//             { name: 'Mike', avatar: '/avatars/mike.png' },
//           ]
//         },
//         {
//           id: '3',
//           name: 'API Integration',
//           status: 'completed',
//           lastUpdated: '3 days ago',
//           team: [
//             { name: 'Lisa', avatar: '/avatars/lisa.png' },
//             { name: 'Tom', avatar: '/avatars/tom.png' },
//           ]
//         }
//       ]
//     }
//
//     // For now, return projects without team members
//     return data.map(project => ({
//       id: project.id,
//       name: project.name,
//       status: project.status,
//       lastUpdated: formatRelativeTime(project.updated_at),
//       team: [] // Empty team for now
//     }))
//   } catch (error) {
//     console.error('Error in fetchRecentProjects:', error)
//     throw handleApiError(error)
//   }
// }

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffInHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 24) {
    return `${diffInHours} hours ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }
}

// Function to calculate project growth rate (Example placeholder)
function calculateGrowthRate(projects: any[]): number {
  // Implement actual growth rate calculation
  return 24
}

export async function getProjectById(id: string) {
  console.log('Fetching project with ID:', id);
  const supabase = getSupabaseInstance();
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project by ID:', error);
      throw new Error(`Failed to fetch project ${id}: ${error.message}`);
    }
    console.log('Project data loaded successfully:', data?.name);
    return data;
  } catch (err) {
    // Log errors originating from parseSupabaseCookie or similar
    console.error('Caught error in getProjectById:', err);
    // Rethrow or handle appropriately
    throw err;
  }
}

export async function getAllProjects() {
  const supabase = getSupabaseInstance();
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  return data;
} 