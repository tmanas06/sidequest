import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlqmmnfwefrvfxpxurci.supabase.co'
  if (url.includes('tlqmmfwefrvfxpxurci')) {
    url = url.replace('tlqmmfwefrvfxpxurci', 'tlqmmnfwefrvfxpxurci')
  }

  return createBrowserClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
