import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/types/supabase";

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
  // Critical: Only create client in browser environment
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called on the client side');
  }
  
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
    
    // Move auth state listener setup to AuthProvider instead of module scope
    // This prevents SSR issues and allows proper component lifecycle management
    
    return supabaseInstance;
    
  } catch (error) {
    console.error("Error creating Supabase client (@supabase/ssr):", error);
    throw error;
  }
}