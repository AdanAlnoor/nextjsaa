import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase'; // Assuming this path is correct

// Define the public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/auth/callback', '/(auth)'];

export async function middleware(request: NextRequest) {
  console.log(`Middleware: Processing request for ${request.nextUrl.pathname}`);
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    console.log('Middleware: Creating Supabase client (@supabase/ssr)...');
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // If the cookie is set, update the request and response cookies
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value, ...options });
            console.log(`Middleware: Set cookie ${name}`);
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the request and response cookies
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value: '', ...options });
            console.log(`Middleware: Removed cookie ${name}`);
          },
        },
      }
    );

    console.log('Middleware: Getting user session...');
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Middleware: Error getting session:', error);
      // Allow request to proceed even if session check fails, maybe show error page later
      return response;
    }

    console.log('Middleware: Session obtained. Authenticated:', !!session);

    // --- Authentication Logic --- (Similar to before, using `session`)
    const isPublic = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    const isHome = request.nextUrl.pathname === '/';

    console.log(`Middleware: Path: ${request.nextUrl.pathname}, Is Public: ${isPublic}, Is Home: ${isHome}, Has Session: ${!!session}`);

    if (isPublic) {
      if (session) {
        console.log('Middleware: Redirecting authenticated user from public route to /projects');
        return NextResponse.redirect(new URL('/projects', request.url));
      }
      console.log('Middleware: Allowing access to public route');
      return response; 
    }
    
    if (isHome) {
      if (session) {
        console.log('Middleware: Redirecting authenticated user from home to /projects');
        return NextResponse.redirect(new URL('/projects', request.url));
      }
      console.log('Middleware: Allowing access to home route');
      return response; 
    }
    
    // Protected routes
    if (!session) {
      // Check if it's an intentionally protected route based on your app's logic
      // For now, let's assume all non-public, non-home routes are protected
      console.log('Middleware: Redirecting unauthenticated user to /login for protected route');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    console.log('Middleware: Allowing access to protected route');
    return response;

  } catch (e) {
    // Catch any unexpected errors during middleware execution
    console.error('Middleware: Uncaught error:', e);
    // Return the original response or a generic error response
    return response; // Or potentially NextResponse.error()
  }
}

// Matcher remains the same
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 