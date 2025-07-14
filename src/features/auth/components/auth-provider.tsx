/**
 * Auth Provider Component
 * 
 * This provides authentication context throughout the application
 * following Supabase's recommended practices.
 */

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthUser } from '@/types/auth'
import type { Database } from '@/shared/types/supabase'
import { Session, User, AuthError, AuthChangeEvent } from '@supabase/supabase-js'

// Define the shape of the context state
interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  
  // Effect to mark component as mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Effect to fetch initial session and set up listener
  useEffect(() => {
    if (!mounted) return

    let isMounted = true
    let supabase: any

    const fetchInitialSession = async () => {
      try {
        const { createClient } = await import('@/shared/lib/supabase/client')
        supabase = createClient()
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (isMounted) {
          setSession(data.session)
          setUser(data.session?.user ?? null)
        }
      } catch (error) {
        console.error("AuthProvider: Error fetching initial session:", error)
      } finally {
        // Ensure loading is set to false only once after initial attempt
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchInitialSession()

    // Subscribe to auth state changes after client is created
    const setupAuthListener = () => {
      if (!supabase) return

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, currentSession: Session | null) => {
          if (isMounted) {
            console.log("AuthProvider: Auth state changed", _event, !!currentSession)
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            // No need to set loading=false here, initial fetch handles it.
            
            // Optional: Refresh page data if needed, but often not necessary with context
            // router.refresh()
          }
        }
      )

      return authListener
    }

    const authListener = setupAuthListener()

    // Cleanup function
    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [mounted])

  // --- Auth Action Methods --- 

  const signIn = async (email: string, password: string) => {
    if (!mounted) return { error: new Error('Component not mounted') as any }
    setLoading(true) // Optional: show loading during sign in
    const { createClient } = await import('@/shared/lib/supabase/client')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) console.error("Sign in error:", error)
    else console.log("Sign in successful")
    return { error } // Return error object
  }

  const signUp = async (email: string, password: string) => {
    if (!mounted) return { error: new Error('Component not mounted') as any }
    setLoading(true)
    const { createClient } = await import('@/shared/lib/supabase/client')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        // Add options if needed, e.g., for email confirmation redirect
        options: {
             emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
     })
    setLoading(false)
    if (error) console.error("Sign up error:", error)
    else console.log("Sign up successful, check email for confirmation")
    return { error } // Return error object
  }

  const signOut = async () => {
    if (!mounted) return
    setLoading(true)
    const { createClient } = await import('@/shared/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    if (error) console.error("Sign out error:", error)
    else {
         console.log("Sign out successful")
         router.push('/login') // Redirect to login after sign out
    }
  }
  
  const refreshSession = async () => {
      if (!mounted) return
      setLoading(true)
      console.log("AuthProvider: Refreshing session...")
      try {
          const { createClient } = await import('@/shared/lib/supabase/client')
          const supabase = createClient()
          const { data, error } = await supabase.auth.refreshSession()
          if (error) throw error
          console.log("AuthProvider: Session refreshed.")
          // State will update via onAuthStateChange listener
      } catch(error) {
          console.error("AuthProvider: Error refreshing session:", error)
      } finally {
          setLoading(false)
      }
  }

  // --- Context Value --- 

  const value: AuthContextType = {
    session,
    user,
    loading,
    isAuthenticated: !!session, // Calculate based on session state
    signIn,
    signUp,
    signOut,
    refreshSession,
  }

  // Don't create Supabase client or access browser APIs until mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={{
        session: null,
        user: null,
        loading: true,
        isAuthenticated: false,
        signIn: async () => ({ error: null }),
        signUp: async () => ({ error: null }),
        signOut: async () => {},
        refreshSession: async () => {}
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Provide the context value to children
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Export as default
export default AuthProvider

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 