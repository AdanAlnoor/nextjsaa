import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <p className="text-xs text-muted-foreground">Average across projects</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to the Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is a placeholder dashboard. Future updates will include real project analytics, 
              cost control summaries, and interactive charts.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}