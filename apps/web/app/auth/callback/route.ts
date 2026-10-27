import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabaseResponse = NextResponse.redirect(new URL(next, requestUrl.origin))

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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('OAuth exchange error:', error)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }

    // Clean up any stale or orphaned auth token chunk cookies from request
    const newCookieNames = new Set(supabaseResponse.cookies.getAll().map(c => c.name))
    request.cookies.getAll().forEach(c => {
      if (c.name.startsWith('sb-') && !newCookieNames.has(c.name)) {
        supabaseResponse.cookies.delete(c.name)
      }
    })

    return supabaseResponse
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
