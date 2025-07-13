import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/shared/types/supabase";

export function createClient() {
  try {
    const cookieStore = cookies();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Missing Supabase environment variables");
    }

    return createServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            try {
              return cookieStore.getAll();
            } catch (error) {
              console.error("Error in getAll cookies:", error);
              return [];
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              console.error("Error setting cookies:", error);
              // This can happen in Server Components and is expected
              // Middleware will handle the auth flow
            }
          },
        },
      }
    );
  } catch (error) {
    console.error("Error creating server client:", error);
    throw error;
  }
}
