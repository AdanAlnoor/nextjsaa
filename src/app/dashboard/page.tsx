import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Activity,
  CreditCard,
  DollarSign,
  Download,
  Plus,
  Users,
  FileClock,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your project overview and metrics',
};

interface Project {
  id: string;
  user_id: string;
  status: string;
  estimated_cost: number;
  name: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
  project_name: string;
}

async function getProjectStats() {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }
  
  // Fetch basic project metrics
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', session.user.id);
    
  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
    return {
      totalProjects: 0,
      activeProjects: 0,
      totalCost: 0,
      recentActivity: []
    };
  }
  
  // Calculate active projects
  const activeProjects = projects?.filter((p: Project) => p.status === 'active') || [];
  
  // Calculate total cost
  const totalCost = projects?.reduce((sum: number, project: Project) => 
    sum + (project.estimated_cost || 0), 0) || 0;
  
  // Get recent activity
  const { data: activity, error: activityError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (activityError) {
    console.error('Error fetching activity:', activityError);
  }
  
  return {
    totalProjects: projects?.length || 0,
    activeProjects: activeProjects.length,
    totalCost,
    recentActivity: activity || []
  };
}

export default async function DashboardPage() {
  const stats = await getProjectStats();
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Projects
                </CardTitle>
                <FileClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Your total project count
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Projects currently in progress
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cost Estimate
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalCost.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total estimated project costs
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cost Analysis
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Detailed</div>
                <p className="text-xs text-muted-foreground">
                  <Link href="/cost-control" className="text-blue-500 hover:underline">
                    View cost analysis
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest project activities
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {stats.recentActivity.length > 0 ? (
                  <div className="space-y-8">
                    {stats.recentActivity.map((activity: ActivityLog) => (
                      <div key={activity.id} className="flex items-center">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{activity.action}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          {activity.project_name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks you may want to perform
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Link href="/projects/new">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create new project
                  </Button>
                </Link>
                
                <Link href="/cost-control">
                  <Button className="w-full justify-start" variant="outline">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Review cost controls
                  </Button>
                </Link>
                
                <Link href="/projects">
                  <Button className="w-full justify-start" variant="outline">
                    <FileClock className="mr-2 h-4 w-4" />
                    Manage projects
                  </Button>
                </Link>
                
                <Link href="/settings">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    User settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Coming Soon</CardTitle>
              <CardDescription>
                Advanced analytics and reporting features will be available in a future update.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Analytics visualization will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Stay updated with project changes and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                No new notifications at this time
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 