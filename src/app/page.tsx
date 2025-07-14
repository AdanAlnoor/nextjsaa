'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Mark component as mounted
    setMounted(true)
    
    // Set initial message and mark loading as finished *after* mount
    setMessage('Checking authentication...')
    setIsLoading(false)

    const checkAuth = async () => {
      try {
        const { createClient } = await import('@/shared/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error checking session:', error)
          setMessage('Error checking authentication status')
          setIsAuthenticated(false)
          return
        }
        
        if (data.session) {
          setMessage('You are authenticated! Redirecting to projects...')
          setIsAuthenticated(true)
          setTimeout(() => {
            router.push('/projects')
          }, 2000)
        } else {
          setMessage('You are not authenticated')
          setIsAuthenticated(false)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setMessage('An unexpected error occurred')
        setIsAuthenticated(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  // Render loading state until mounted
  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div>Loading page...</div>
      </div>
    )
  }

  // Render main content only after loading
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" suppressHydrationWarning>
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Construction Project Manager</h1>
        
        <div className="mt-4 rounded-lg bg-gray-100 p-6 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold" suppressHydrationWarning>{message}</h2>
          
          {isAuthenticated === false && (
            <div className="mt-4 space-y-4">
              <p>Please sign in to access your projects</p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/login"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Go to Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Debug Info:</p>
          <p suppressHydrationWarning>Authentication Status: {isAuthenticated === null ? 'Checking...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</p>
          <p suppressHydrationWarning>Current URL Path: {pathname}</p>
        </div>
      </main>
    </div>
  )
} 