'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { UserNav } from "@/shared/components/navigation/UserNav"
import { MoreHorizontal, PlusCircle, LogOut, Loader2, Users } from "lucide-react"
import { format } from 'date-fns' // For date formatting
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"; // For error display
import { Terminal } from "lucide-react"; // Icon for error alert
import RoleGuard from '@/auth/components/auth/RoleGuard' // Import the RoleGuard component
import { hasPermission } from '@/auth/utils/roles' // Import the role utility
import { ROLES } from '@/auth/utils/roles' // Import role constants

interface Project {
  id: string
  name: string
  client: string | null
  status: string
  created_at: string
  // Add other relevant fields if needed, e.g., address, project_manager
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [canCreateProject, setCanCreateProject] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    async function loadProjectsAndUser() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !currentUser) {
          console.error("Auth check failed on client:", userError?.message || "No user found");
          setError('You must be logged in to view projects.');
          setLoading(false);
          router.replace('/login'); 
          return;
        }
        setUser(currentUser);

        // Check if the user can create projects using our new permission system
        const canCreate = await hasPermission('create_project');
        setCanCreateProject(canCreate);

        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, client, status, created_at') // Select only needed columns
          .order('created_at', { ascending: false })
        
        if (projectsError) throw projectsError; // Let catch block handle it

        setProjects(projectsData || []);

      } catch (err: any) {
        console.error('Unexpected error loading data:', err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
    loadProjectsAndUser();
  }, [router]);
  
  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out: ' + error.message);
    } else {
      toast.success('Signed out successfully');
      router.replace('/login'); 
    }
  }

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }
  
  // Error state if user couldn't be loaded (should be caught by redirect generally)
  if (!user) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">{error || 'Please log in to access this page.'}</p>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Main content when user is loaded
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="relative ml-auto flex-1 md:grow-0">
          {/* Optional Search Bar Placeholder */}
          {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search projects..." className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]" /> */}
        </div>
        
        {/* Show Add Project button only to users with 'create_project' permission */}
        <RoleGuard requiredPermission={ROLES.ADMIN}>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Project
            </span>
          </Button>
        </RoleGuard>

        <UserNav />
      </header>

      {/* Main Content Area */}
      <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {/* Display error loading projects if it occurred */}
          {error && (
             <Alert variant="destructive" className="mb-4">
               <Terminal className="h-4 w-4" />
               <AlertTitle>Error Loading Projects</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}

          {/* Projects Grid/List */}
          {projects.length === 0 && !error ? (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
               <div className="flex flex-col items-center gap-1 text-center">
                 <h3 className="text-2xl font-bold tracking-tight">
                   No projects yet
                 </h3>
                 <p className="text-sm text-muted-foreground mb-3">
                   Get started by creating your first project.
                 </p>

                 {/* Only show Add Project button to users with permission */}
                 <RoleGuard requiredPermission={ROLES.ADMIN}>
                   <Button size="sm" className="gap-1">
                      <PlusCircle className="h-3.5 w-3.5" /> Add Project
                   </Button>
                 </RoleGuard>
               </div>
             </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold leading-tight tracking-tight">{project.name}</CardTitle>
                       {/* Project actions dropdown with role protection */}
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-6 w-6">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           {/* Only show Edit option to project managers */}
                           <RoleGuard requiredPermission={ROLES.PROJECT_MANAGER} projectId={project.id}>
                             <DropdownMenuItem>Edit</DropdownMenuItem>
                           </RoleGuard>
                           
                           {/* Only show Team option to project managers */}
                           <RoleGuard requiredPermission={ROLES.PROJECT_MANAGER} projectId={project.id}>
                             <DropdownMenuItem onClick={() => setShowInviteModal(true)}>
                                <Users className="h-4 w-4 mr-2" /> Manage Team
                             </DropdownMenuItem>
                           </RoleGuard>
                           
                           {/* Only show Delete option to admins */}
                           <RoleGuard requiredPermission={ROLES.ADMIN}>
                             <DropdownMenuItem className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                           </RoleGuard>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </div>
                     <CardDescription className="text-xs text-muted-foreground">
                      Client: {project.client || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 py-2">
                     {/* Add more project details here if needed */}
                     {/* <p className="text-sm text-muted-foreground">Address: ...</p> */}
                  </CardContent>
                  <CardFooter className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                    <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>{project.status || 'Unknown'}</Badge>
                    <span>{format(new Date(project.created_at), 'PP')}</span>
                  </CardFooter>
                   {/* Make the whole card the link */}
                  <Link href={`/projects/${project.id}/bq`} className="absolute inset-0"><span className="sr-only">View Project</span></Link>
                </Card>
              ))}
            </div>
          )}
      </main>

      {/* Render the invite modal when showInviteModal is true */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Role-Based Feature</h2>
            <p className="mb-4">
              This is where the InviteUserModal component would appear, allowing project managers to invite users to this project with specific roles.
            </p>
            <Button onClick={() => setShowInviteModal(false)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </div>
  )
} 