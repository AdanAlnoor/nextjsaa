import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register', 
    '/auth/callback',
    '/email-verify',
    '/auth/auth-code-error'
  ]

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  try {
    // Create Supabase client for middleware
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // User is authenticated, allow the request
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware auth error:', error)
    // On error, redirect to login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 