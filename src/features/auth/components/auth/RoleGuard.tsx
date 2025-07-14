import { ReactNode, useEffect, useState } from 'react'
import { hasPermission } from '@/auth/utils/permissions'
import { Loader2 } from 'lucide-react'
import type { Role } from '@/auth/utils/roles'
import { useRouter } from 'next/navigation'

// Permission cache to avoid repeated checks
type PermissionCacheKey = string;
type PermissionCacheEntry = {
  result: boolean;
  timestamp: number;
};

// Cache permissions for 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000;
const permissionCache = new Map<PermissionCacheKey, PermissionCacheEntry>();

interface RoleGuardProps {
  children: ReactNode
  requiredPermission: string
  projectId?: string
  fallback?: ReactNode
}

export default function RoleGuard({ 
  children, 
  requiredPermission,
  projectId,
  fallback = <LoadingSpinner />
}: RoleGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [supabase, setSupabase] = useState<any>(null)
  const router = useRouter()
  
  // Generate a cache key for this permission check
  const cacheKey = `${requiredPermission}:${projectId || 'global'}`;
  
  // Initialize Supabase client
  useEffect(() => {
    const initSupabase = async () => {
      const { createClient } = await import('@/shared/lib/supabase/client');
      setSupabase(createClient());
    };
    initSupabase();
  }, []);
  
  useEffect(() => {
    let isMounted = true
    
    const checkAccess = async () => {
      if (!supabase) return;
      
      try {
        // First check cache
        const cachedPermission = permissionCache.get(cacheKey);
        const now = Date.now();
        
        if (cachedPermission && (now - cachedPermission.timestamp < CACHE_EXPIRY_MS)) {
          // Use cached result if valid
          console.log(`RoleGuard: Using cached permission for '${requiredPermission}'`);
          if (isMounted) {
            setHasAccess(cachedPermission.result);
            setIsLoading(false);
          }
          return;
        }
        
        // Not in cache or expired, check permission
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.log('RoleGuard: No user found, redirecting to login.')
          router.push('/login')
          return
        }
        
        console.log(`RoleGuard: Checking permission '${requiredPermission}' for user ${user.id}${projectId ? ` in project ${projectId}` : ''}`)
        const permissionGranted = await hasPermission(user.id, requiredPermission, projectId)
        
        // Cache the result
        permissionCache.set(cacheKey, {
          result: permissionGranted,
          timestamp: now
        });
        
        if (isMounted) {
          console.log(`RoleGuard: Permission '${requiredPermission}' granted: ${permissionGranted}`)
          setHasAccess(permissionGranted)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('RoleGuard: Error checking permissions:', error)
        if (isMounted) {
          setHasAccess(false)
          setIsLoading(false)
        }
      }
    }

    checkAccess()
    
    return () => {
      isMounted = false
    }
  }, [supabase, router, requiredPermission, projectId, cacheKey])
  
  if (isLoading) {
    return <>{fallback}</>
  }

  if (hasAccess === false) {
    console.log('RoleGuard: Access denied')
    return null
  }

  return <>{children}</>
}

// Better loading component
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Checking permissions...</p>
    </div>
  )
}

export { RoleGuard } 