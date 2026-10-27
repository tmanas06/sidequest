import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  return handleSignOut(request)
}

export async function GET(request: NextRequest) {
  return handleSignOut(request)
}

async function handleSignOut(request: NextRequest) {
  const supabaseResponse = NextResponse.redirect(new URL('/', request.url))

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlqmmnfwefrvfxpxurci.supabase.co'
  if (url.includes('tlqmmfwefrvfxpxurci')) {
    url = url.replace('tlqmmfwefrvfxpxurci', 'tlqmmnfwefrvfxpxurci')
  }

  const supabase = createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.signOut()
  return supabaseResponse
}
