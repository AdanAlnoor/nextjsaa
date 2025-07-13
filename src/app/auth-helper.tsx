'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useToast } from '@/shared/components/ui/use-toast'

export default function AuthHelper() {
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error getting user:', error)
        setUser(null)
      } else {
        setUser(data.user)
      }
      setIsLoading(false)
    }
    
    getUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event)
      setUser(session?.user ?? null)
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to login',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: 'Success',
        description: 'Logged out successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to logout',
        variant: 'destructive'
      })
    }
  }
  
  const handleClearStorage = () => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    })
    toast({
      title: 'Storage cleared',
      description: 'All local storage, session storage and cookies have been cleared',
    })
    setTimeout(() => window.location.reload(), 1000)
  }
  
  const checkConnection = async () => {
    try {
      const start = Date.now()
      const { data, error, count } = await supabase.from('purchase_orders').select('count()', { count: 'exact' })
      const duration = Date.now() - start
      
      if (error) throw error
      
      toast({
        title: 'Database connection successful',
        description: `Connected in ${duration}ms. Count: ${count || 0}`,
      })
    } catch (error: any) {
      toast({
        title: 'Database connection failed',
        description: error.message || 'Could not connect to database',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="container max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Helper</CardTitle>
          <CardDescription>
            Debug and fix authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={user ? "status" : "login"}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>
            <TabsContent value="status" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={isLoading ? "outline" : user ? "default" : "destructive"}>
                    {isLoading ? "Loading..." : user ? "Authenticated" : "Not authenticated"}
                  </Badge>
                </div>
                
                {user && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">User ID:</span>
                      <span className="text-sm font-mono">{user.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span>{user.email}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={user ? handleSignOut : () => {}}
                  variant={user ? "default" : "outline"}
                  disabled={!user}
                  className="w-full"
                >
                  {user ? "Sign Out" : "Not Logged In"}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="login" className="space-y-4 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loading..." : "Login"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="tools" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <Button onClick={checkConnection} variant="outline">
                  Test Database Connection
                </Button>
                <Button onClick={handleClearStorage} variant="destructive">
                  Clear All Storage & Cookies
                </Button>
                <Button onClick={() => window.location.href = '/projects'} variant="outline">
                  Go to Projects Page
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between text-xs text-gray-500">
          <span>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15)}...</span>
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => window.location.href = '/login'}
          >
            Regular Login →
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 