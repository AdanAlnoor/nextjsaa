/**
 * Auth Callback Route
 * 
 * This route handles the callback from Supabase Auth after email confirmation
 * and redirects users to the appropriate page.
 */
import { createClient } from '@/shared/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/shared/types/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/projects'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  console.error('Error exchanging code for session or code missing')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

 