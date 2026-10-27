import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createClient() {
  const cookieStore = await cookies()
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlqmmnfwefrvfxpxurci.supabase.co'
  if (url.includes('tlqmmfwefrvfxpxurci')) {
    url = url.replace('tlqmmfwefrvfxpxurci', 'tlqmmnfwefrvfxpxurci')
  }

  return createServerClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookie mutations handled by middleware
          }
        },
      },
    }
  )
}

/** Service-role client for ingestion — NEVER use on client side */
export function createServiceClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlqmmnfwefrvfxpxurci.supabase.co'
  if (url.includes('tlqmmfwefrvfxpxurci')) {
    url = url.replace('tlqmmfwefrvfxpxurci', 'tlqmmnfwefrvfxpxurci')
  }

  return createSupabaseClient<Database>(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
