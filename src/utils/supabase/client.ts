import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Helper function to safely parse cookies with base64 prefix
function parseCookie(cookieString: string, name: string): string | null {
  if (!cookieString) return null;
  
  const matches = cookieString.match(new RegExp(
    '(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'
  ));
  
  if (!matches || !matches[1]) return null;
  
  let value = decodeURIComponent(matches[1]);
  
  // Handle base64 prefixed cookies
  if (value && value.startsWith('base64-')) {
    value = value.replace(/^base64-/, '');
  }
  
  return value;
}

// Singleton instance
let supabaseInstance: SupabaseClient<Database> | null = null;

export function createClient() {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables missing:", { 
        url: !!supabaseUrl, 
        key: !!supabaseKey 
      });
      throw new Error("Missing Supabase environment variables");
    }
    
    // Log environment info for debugging
    const urlParts = supabaseUrl.split('.');
    console.log("Initializing Supabase client (@supabase/ssr) with URL prefix:", urlParts[0]);
    
    // Create client with persistent localStorage strategy
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public',
      }
    });
    
    // Add a listener to monitor auth state changes
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, "Session exists:", !!session);
      
      // Force refresh the instance if the session changed
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // We keep the same instance but log the successful auth event
        console.log("Authentication refreshed successfully");
      }
    });
    
    // Test connection only on first creation
    setTimeout(async () => {
      try {
        const { data } = await supabaseInstance!.auth.getSession();
        console.log("Client session check:", data.session ? 'Active' : 'None');
        
        if (data.session) {
          // If we have a session, verify it works
          try {
            const user = await supabaseInstance!.auth.getUser();
            console.log("Authenticated as user:", user.data.user?.email);
          } catch (userError) {
            console.error("Session exists but getUser failed:", userError);
          }
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
    }, 1000);
    
    return supabaseInstance;
    
  } catch (error) {
    console.error("Error creating Supabase client (@supabase/ssr):", error);
    throw error;
  }
}