'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/shared/lib/supabase/client'
import { Database } from '@/shared/types/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }
        
        // Check if user has admin role
        const { data, error } = await supabase
          .from('user_role_assignments')
          .select(`
            user_roles!inner(name)
          `)
          .eq('user_id', user.id)
          .eq('user_roles.name', 'admin')
          .limit(1)
        
        if (error || !data || data.length === 0) {
          console.error('Access check error or not admin:', error)
          router.push('/')
          return
        }
        
        setIsAdmin(true)
      } catch (error) {
        console.error('Error checking admin access:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    
    checkAdminAccess()
  }, [router, supabase])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  if (!isAdmin) {
    return null // Will redirect in useEffect
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-blue-600">
                  Project Manager
                </Link>
                <h1 className="ml-4 text-xl font-bold border-l-2 pl-4 border-gray-200">Admin Panel</h1>
              </div>
              <div className="ml-6 flex space-x-8">
                <Link 
                  href="/admin/users" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                    pathname === '/admin/users' 
                      ? 'border-blue-500 text-blue-600 font-semibold' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  User Management
                </Link>
                <Link 
                  href="/admin/roles" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                    pathname === '/admin/roles' 
                      ? 'border-blue-500 text-blue-600 font-semibold' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Role Management
                </Link>
                <Link 
                  href="/admin/catalog" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                    pathname === '/admin/catalog' 
                      ? 'border-blue-500 text-blue-600 font-semibold' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Catalog Management
                </Link>
                <Link 
                  href="/admin/library" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                    pathname === '/admin/library' 
                      ? 'border-blue-500 text-blue-600 font-semibold' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🗄️ Library System
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                Back to Main App
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
} 